const rp = require('request-promise');
const winston = require('winston');

var moviedbAPI = function(config, redisClient, mongoClient){
    var self = this;
    var ONE_YEAR = 24 * 60 * 60 * 1000 * 365;

    this.config = config;
    this.redis = redisClient;
    this.mongo = mongoClient; // TODO: Make use of this
    this.logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({ level: 'debug' })
        ]
    });

    this.reqWithRetry({
        'uri': '/configuration'
    }, '/configuration', true).then(function(data) {
        self.config.images = data.images
    });

    this.logger.info("MovieDBAPI instantiated");

    this.person = {
        search: function(query) {
            return self.reqWithRetry({
                'uri': '/search/person',
                'qs': {'query': query}
            }, '/search/person', true);
        },
        details: function(id) {
            return self.reqWithRetry({
                'uri': `/person/${id}`
            }).then(function(data){
                pphotos = self.config.images.profile_sizes.map((pp) => {
                    return `${self.config.images.base_url}${pp}${data.profile_path}`;
                });
                data['profile_pictures'] = pphotos;
                return data;
            });
        },
        credits: function(id, media) {
            return self.reqWithRetry({
                'uri': `/person/${id}/${media}_credits`
            });
        },
        creditsWithAge: function(id, media) {
            return Promise.all([
                self.person.details(id),
                self.person.credits(id, media)
            ]).then(function(payload){
                var details = payload[0];
                var castIn = payload[1]['cast'] || [];
                var crewIn = payload[1]['crew'] || [];

                if (details.birthday) {
                    var parsedBirthday = Date.parse(details.birthday);
                    var parsedRelease;
                    var augmentedCastIn = castIn.map(function(movie) {
                        if (movie.release_date) {
                            parsedRelease = Date.parse(movie.release_date);
                            movie.age_at_release = (parsedRelease - parsedBirthday) / ONE_YEAR;
                        } else {
                            movie.age_at_release = null;
                        }
                        return movie;
                    });

                    var augmentedCrewIn = crewIn.map(function(movie) {
                        if (movie.release_date) {
                            parsedRelease = Date.parse(movie.release_date);
                            movie.age_at_release = (parsedRelease - parsedBirthday) / ONE_YEAR;
                        } else {
                            movie.age_at_release = null;
                        }
                        return movie;
                    });

                    payload[1]['cast'] = augmentedCastIn;
                    payload[1]['crew'] = augmentedCrewIn;
                }
                return payload[1];
            })
        }
    };

    this.movie = {
        search: function(query) {
            return self.reqWithRetry({
                'uri': '/search/movie',
                'qs': {'query': query}
            }, '/search/movie', true);
        },
        details: function(id) {
            return self.reqWithRetry({
                'uri': `/movie/${id}`
            });
        },
        credits: function(id) {
            return self.reqWithRetry({
                'uri': `/movie/${id}/credits`
            });
        },
        cast: function(id) {
            return self.movie.credits(id).then((credits) => {
                return (credits.cast || []).map(m => m.id);
            });
        },
        crew: function(id) {
            return self.movie.credits(id).then((credits) => {
                return (credits.crew || []).map(m => m.id);
            });
        }
    };

    this.common = {
        works: function(p1, p2, media) {
            return Promise.all([
                self.person.credits(p1, media),
                self.person.credits(p2, media)
            ]).then((results) => {
                const movieSet1 = new Set((results[0].cast || []).map(x => x.id));
                const movieSet2 = new Set((results[1].cast || []).map(x => x.id));

                const commonMovies = new Set();
                movieSet1.forEach(x => {
                    if (movieSet2.has(x)) {
                        commonMovies.add(x);
                    }
                });

                return Array.from(commonMovies);
            })
        },
        castmate: function(pid, media) {
            return self.person.credits(pid, media).then((credits) => {
                const appearedIn = credits.cast || [];
                const appearedInIds = appearedIn.map(m => m.id);

                return Promise.all(appearedInIds.map(self.movie.cast)).then(function(castLists) {
                    const counts = {};
                    castLists.forEach(list => {
                        list.forEach(person => {
                            counts[person] = counts[person] || 0;
                            counts[person] += 1;
                        });
                    });
                    delete counts[pid];
                    return counts;
                });
            })
        },
        crew: function(pid, media) {
            return self.person.credits(pid, media).then((credits) => {
                const appearedIn = credits.cast || [];
                const appearedInIds = appearedIn.map(m => m.id);

                return Promise.all(appearedInIds.map(self.movie.crew)).then(function(crewLists) {
                    const counts = {};
                    crewLists.forEach(list => {
                        list.forEach(person => {
                            counts[person] = counts[person] || 0;
                            counts[person] += 1;
                        });
                    });
                    delete counts[pid];
                    return counts;
                });
            })

        }
    }
};

moviedbAPI.prototype.reqWithRetry = function(options, _stem, ignoreCache) {
    const self = this;
    const stem = _stem || options.uri;
    options['uri'] = `${this.config.API_BASE}${stem}`;
    options['qs'] = options['qs'] || {};
    options['qs']['api_key'] = this.config.API_KEY;
    options['resolveWithFullResponse'] = true;
    return new Promise((resolve, reject) => {
        // key in redis by url path
        self.redis.getAsync(stem).then(function(value){
            if (value && !ignoreCache) {
                self.logger.debug(`Found ${stem} in cache`);
                // self.redis.ttlAsync(stem).then(function(ttl) {
                //     self.logger.debug(`${stem} - ${ttl} seconds left in cache`);
                // });
                resolve(JSON.parse(value));
            } else {
                rp(options).then((response) =>{
                    self.logger.debug(`GET ${stem} -- ${response.statusCode}`);
                    self.redis.setAsync(stem, response.body).then(function() {
                        self.redis.expire(stem, 3600);
                        resolve(JSON.parse(response.body));
                    }).catch(function(err) {
                        self.logger.error(err);
                    });
                }).catch((err) => {
                    if (err.statusCode === 429) {
                        self.logger.warn("Received 429; Sleeping for 4 seconds");
                        setTimeout(() => {
                            resolve(self.reqWithRetry(options, stem, ignoreCache));
                        }, 4000);
                    } else {
                        self.logger.error(err);
                        reject(err);
                    }
                });
            }
        }).catch(function(err) {
            self.logger.error(err);
            reject(err);
        });
    });
};

module.exports = moviedbAPI;
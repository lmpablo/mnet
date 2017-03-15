const express = require('express');
const rp = require('request-promise');
const router = express.Router();
const config = require('../config');
const winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({ level: 'debug' })
    ]
});

var API = {};

API.healthCheck = (req, res, next) => {
    res.json({
        'status': 'OK',
        'timestamp': (new Date()).valueOf()
    });
};

API.personSearch = (req, res, next) => {
    const moviedb = req.app.get('moviedb');

    moviedb.person.search(req.query.q)
        .then((data) => {
            res.json(data);
        }).catch((err) => {
            logger.error(err);
            res.status(500).send(err);
        });
};

API.personDetails = (req, res, next) => {
    const moviedb = req.app.get('moviedb');

    moviedb.person.details(req.params.personId)
        .then((data) => {
            res.json(data);
        }).catch((err) => {
        logger.error(err);
        res.status(500).send(err);
    });
};

API.personCredits = (req, res, next) => {
    const moviedb = req.app.get('moviedb');
    const media = req.query.media || 'movie';

    (req.query.with_age ?
        moviedb.person.creditsWithAge(req.params.personId, media) :
        moviedb.person.credits(req.params.personId, media))
        .then((data) => {
            res.json(data);
        }).catch((err) => {
        logger.error(err);
        res.status(500).send(err);
    });
};

API.movieSearch = (req, res, next) => {
    const moviedb = req.app.get('moviedb');

    moviedb.movie.search(req.query.q)
        .then((data) => {
            res.json(data);
        }).catch((err) => {
        logger.error(err);
        res.status(500).send(err);
    });
};

API.movieDetails = (req, res, next) => {
    const moviedb = req.app.get('moviedb');

    moviedb.movie.details(req.params.movieId)
        .then((data) => {
            res.json(data);
        }).catch((err) => {
        logger.error(err);
        res.status(500).send(err);
    });
};

API.movieCredits = (req, res, next) => {
    const moviedb = req.app.get('moviedb');

    moviedb.movie.credits(req.params.movieId)
        .then((data) => {
            res.json(data);
        }).catch((err) => {
        logger.error(err);
        res.status(500).send(err);
    });
};

API.commonWorks = (req, res, next) => {
    const moviedb = req.app.get('moviedb');

    const media = req.query.media || 'movie';

    moviedb.common.works(req.params.person1, req.params.person2, media)
        .then((data) => {
            res.send({
                'results': data
            });
        }).catch((err) => {
        logger.error(err);
        res.status(500).send(err);
    });
};

API.commonCastmates = (req, res, next) => {
    const moviedb = req.app.get('moviedb');
    const media = req.query.media || 'movie';

    moviedb.common.castmate(req.params.personId, media)
        .then((data) => {
            const values = [];
            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    values.push(data[key]);
                }
            }
            res.send({
                'results': data,
                'max': Math.max.apply(null, values)
            });
        }).catch((err) => {
            logger.error(err);
            res.status(500).send(err);
        });
};

API.commonCrew = (req, res, next) => {
    const moviedb = req.app.get('moviedb');
    const media = req.query.media || 'movie';

    moviedb.common.crew(req.params.personId, media)
        .then((data) => {
            const values = [];
            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    values.push(data[key]);
                }
            }
            res.send({
                'results': data,
                'max': Math.max.apply(null, values)
            });
        }).catch((err) => {
            logger.error(err);
            res.status(500).send(err);
        });
};

router.get('/', API.healthCheck);

// /person endpoints
router.get('/person/search', API.personSearch);
router.get('/person/:personId/details', API.personDetails);
router.get('/person/:personId/credits', API.personCredits);

// /movie endpoints
router.get('/movie/search', API.movieSearch);
router.get('/movie/:movieId/details', API.movieDetails);
router.get('/movie/:movieId/credits', API.movieCredits);

// /common endpoints
router.get('/common/:person1/works/:person2', API.commonWorks);
router.get('/common/:personId/castmate', API.commonCastmates);
router.get('/common/:personId/crew', API.commonCrew);

// search for common cast mate
// search for common director
// search for common genre



module.exports = router;

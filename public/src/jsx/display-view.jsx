import React from 'react';
import axios from 'axios';
import update from 'immutability-helper';


class DisplayView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: '',
            bio: {},
            common: [],
            status: ''
        }
    }

    componentWillReceiveProps(nextProps) {
        const self = this;

        if (nextProps.pid && nextProps.pid !== this.state.id) {
            axios.get(`/api/person/${nextProps.pid}/details`).then((payload) => {
                const details = payload.data;
                self.setState(update(self.state, {
                    id: {$set: nextProps.id},
                    bio: {$set: details},
                    status: {$set: 'Processing...'},
                    common: {$set: []}
                }));
            });

            axios.get(`/api/common/${nextProps.pid}/castmate`).then((payload) => {
                const details = payload.data.results;
                const people = [];
                for (let person in details) {
                    if (details.hasOwnProperty(person) && details[person] > 2) {
                        people.push([person, details[person]])
                    }
                }

                people.sort((a, b) => {
                    return b[1] - a[1];
                });

                self.setState(update(self.state, {
                    status: {$set: 'Updating...'},
                    common: {$set: []}
                }));

                Promise.all(people.map((p) => {
                    const pid = p[0];
                    return axios.get(`/api/person/${pid}/details`).then((payload) => {
                        const curr = self.state.common  || [];
                        const element = {
                            info: payload.data,
                            count: p[1]};
                        curr.push(element);
                        self.setState(update(self.state, {
                            common: {$set: curr}
                        }));
                        return element;
                    }).catch((err) => {
                        console.log(err);
                        return '';
                    });
                })).then(function(app) {
                    self.setState(update(self.state, {
                        common: {$set: app},
                        status: {$set: ''}
                    }));

                });

            });
        }
    }

    render() {
        const pps = this.state.bio.profile_pictures || [];
        const profile_picture = pps.length > 0 ? pps[pps.length - 1] : 'https://cdn.shutterstock.com/shutterstock/videos/267883/thumb/10.jpg';

        const names = this.state.common.map(x => <li key={x.id}>{x.info.name} ({x.count})</li>);
        if (this.state.bio.name) {
            return (
                <div>
                    <h2>{this.state.bio.name}</h2>
                    <p><img height="150" src={profile_picture} alt=""/></p>
                    <p><strong>Birthday: </strong>{this.state.bio.birthday}</p>
                    <p><strong>Place of Birth: </strong>{this.state.bio.place_of_birth}</p>
                    <p><a href={`http://imdb.com/name/${this.state.bio.imdb_id}`}>IMDB Page</a></p>
                    <h3>{this.state.status}</h3>
                    <p><ul>{names}</ul></p>
                </div>
            )
        } else {
            return <div></div>
        }
    }
}

export default DisplayView
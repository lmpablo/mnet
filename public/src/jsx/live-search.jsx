import React from 'react';
import update from 'immutability-helper';
import axios from 'axios';
import ReactTimeout from 'react-timeout'
import SearchResultItem from './search-result-item.jsx';

class LiveSearch extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            textInput: '',
            results: [],
            selected: null
        };
        this.updateSearch =  this.updateSearch.bind(this);
        this.updateSelected = this.updateSelected.bind(this);
        this.changeHandler = this.changeHandler.bind(this);
    }

    componentWillMount() {
        // timeout variable
        this.refreshing = null;
    }

    updateSelected(e) {
        // trigger View update
        this.props.onSelectResult(e);

        // clear search box
        this.setState(update(this.state, {
            textInput: {$set: ''},
            results: {$set: []}
        }));
    }

    updateSearch() {
        const self = this;
        // prevent from calling on null query
        if (this.state.textInput !== '') {
            axios.get(`/api/person/search?q=${this.state.textInput}`).then((payload) => {
                const names = payload.data.results.map((r) => {
                    return {
                        'name': r.name,
                        'id': r.id
                    }
                });
                self.setState(update(self.state, {
                    results: {$set: names}
                }))
            })
        } else {
            this.setState(update(this.state, {
                results: {$set: []}
            }))
        }
    }
    changeHandler(e) {
        if (this.state !== e.target.value) {
            this.setState(update(this.state, {
                textInput: {$set: e.target.value || ''},
            }));
        }

        if (this.refreshing) {
            this.props.clearTimeout(this.refreshing)
        }

        this.refreshing = this.props.setTimeout(this.updateSearch, 350);
    }
    render() {
        const self = this;
        const list = this.state.results.map((result) => {
            return (
                <div key={result.id}>
                    <SearchResultItem clickHandler={self.updateSelected}
                                      data={result} />
                </div>
            )
        });
        return (
            <div className="live-search">
                <div className="search-container">
                    <div className="search-input-container">
                        <input className="search-input" type="text" onChange={this.changeHandler}/>
                        <div className="search-icon">
                            <i className="fa fa-search"></i>
                        </div>
                    </div>
                </div>
                <div>
                    <div className="search-results-container">{list}</div>
                </div>
            </div>
        )
    }
}

export default ReactTimeout(LiveSearch);
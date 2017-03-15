import React from 'react';
import LiveSearch from './live-search.jsx';
import DisplayView from './display-view.jsx';
import {render} from 'react-dom';
import update from 'immutability-helper';

require('../scss/index.scss');

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            selected: null
        };

        this.updateSelected = this.updateSelected.bind(this);

    }

    updateSelected(e) {
        this.setState(update(this.state, {
            selected: {$set: e}
        }));
    }

    render() {
        return (
            <div>
                <LiveSearch onSelectResult={this.updateSelected} />
                <DisplayView pid={this.state.selected} />
            </div>
        )
    }
}

render(<App/>, document.getElementById('app'));
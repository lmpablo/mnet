import React from 'react';

class SearchResultItem extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
        this.clickHandler =  this.clickHandler.bind(this);
    }

    clickHandler() {
        this.props.clickHandler(this.props.data.id)
    }

    render() {
        return (
            <div className="search-result-item-container" onClick={this.clickHandler}>
                <div>{this.props.data.name}</div>
            </div>
        )
    }
}

export default SearchResultItem
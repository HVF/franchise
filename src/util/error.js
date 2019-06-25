import React from 'react'

// largely shamelessly plagiarized from https://github.com/bvaughn/react-error-boundary

const toTitle = (error, componentStack) => {
  return `${error.toString()}\n\nThis is located at:${componentStack}`;
};


function FallbackComponent({componentStack, error}){
    return <div title={toTitle(error, componentStack)} className="error">
        ${error.toString()}
    </div>
}

export default class ErrorBoundary extends React.Component {
  constructor(){
    super()
    this.state = {
      error: null,
      info: null
    }
  }
  componentDidCatch(error, info) {
    
    this.setState({error, info});
  }

  render() {
    const {children} = this.props;
    const {error, info} = this.state ;

    if (error !== null) {
      return (
        <FallbackComponent
          componentStack={
            // istanbul ignore next: Ignoring ternary; can’t reproduce missing info in test environment.
            info ? info.componentStack : ''
          }
          error={error}
        />
      );
    }

    return children || null;
  }
}
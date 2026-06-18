import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container section error-boundary">
          <h2>Что-то пошло не так 😢</h2>
          <p>Произошла ошибка в приложении:</p>
          <pre>{this.state.error?.toString()}</pre>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

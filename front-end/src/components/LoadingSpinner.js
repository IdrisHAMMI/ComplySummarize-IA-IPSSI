import '../styles/spinner.css';

const LoadingSpinner = () => {
  return (
    <div className="spinner-overlay">
      <div className="spinner"></div>
      <p>Analyzing document...</p>
    </div>
  );
};

export default LoadingSpinner;
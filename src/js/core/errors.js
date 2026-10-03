var installed = false;
function installGlobalErrorBoundary({ onError = console.error } = {}) {
  if (installed) return () => {
  };
  installed = true;
  const handleError = (event) => onError(event.error || new Error(event.message || "Unknown error"));
  const handleRejection = (event) => onError(event.reason || new Error("Unhandled promise rejection"));
  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);
  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
    installed = false;
  };
}

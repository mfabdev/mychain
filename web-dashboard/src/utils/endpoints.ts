export const getRestEndpoint = () => {
  if (process.env.REACT_APP_REST_ENDPOINT) {
    return process.env.REACT_APP_REST_ENDPOINT;
  }
  // Use current host if not specified
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:1317`;
};

export const getRpcEndpoint = () => {
  if (process.env.REACT_APP_RPC_ENDPOINT) {
    return process.env.REACT_APP_RPC_ENDPOINT;
  }
  // Use current host if not specified
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:26657`;
};

export const getTerminalServerEndpoint = () => {
  if (process.env.REACT_APP_TERMINAL_SERVER) {
    return process.env.REACT_APP_TERMINAL_SERVER;
  }
  // Use current host if not specified
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3003`;
};

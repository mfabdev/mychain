export const getRestEndpoint = () => {
  return process.env.REACT_APP_REST_ENDPOINT || 'http://localhost:1317';
};

export const getRpcEndpoint = () => {
  return process.env.REACT_APP_RPC_ENDPOINT || 'http://localhost:26657';
};

export const getTerminalServerEndpoint = () => {
  return process.env.REACT_APP_TERMINAL_SERVER || 'http://localhost:3003';
};

// Global variable to store the scroll to top function
let globalScrollToTop: (() => void) | null = null;

export const setGlobalScrollToTop = (fn: (() => void) | null) => {
  globalScrollToTop = fn;
};

export const getGlobalScrollToTop = () => {
  return globalScrollToTop;
};

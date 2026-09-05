type ReconciliationListener = () => void;

const listeners = new Set<ReconciliationListener>();

/** Ask the signed-in app shell to reconcile Passport progress after a write. */
export const requestPassportReconciliation = () => {
  for (const listener of listeners) listener();
};

export const subscribeToPassportReconciliationRequests = (
  listener: ReconciliationListener
) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

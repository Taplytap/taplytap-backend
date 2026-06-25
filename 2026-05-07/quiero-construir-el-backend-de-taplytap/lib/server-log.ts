type LoggableError = {
  message?: unknown;
  stack?: unknown;
  digest?: unknown;
};

export function logServerError(route: string, error: unknown) {
  const safeError = toSafeError(error);

  if (safeError.digest === "DYNAMIC_SERVER_USAGE") {
    return;
  }

  console.error("[TaplyTap server error]", {
    route,
    timestamp: new Date().toISOString(),
    message: safeError.message,
    stack: safeError.stack,
    digest: safeError.digest
  });
}

function toSafeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      digest: readDigest(error)
    };
  }

  if (typeof error === "object" && error !== null) {
    const loggableError = error as LoggableError;

    return {
      message: typeof loggableError.message === "string" ? loggableError.message : "Unknown object error",
      stack: typeof loggableError.stack === "string" ? loggableError.stack : undefined,
      digest: typeof loggableError.digest === "string" ? loggableError.digest : undefined
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
    stack: undefined,
    digest: undefined
  };
}

function readDigest(error: Error) {
  const digest = (error as Error & { digest?: unknown }).digest;
  return typeof digest === "string" ? digest : undefined;
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerEmbeddedBackend } = await import("./instrumentation-node");
    await registerEmbeddedBackend();
  }
}

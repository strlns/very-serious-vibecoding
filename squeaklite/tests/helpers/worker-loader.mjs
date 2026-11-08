export async function resolve(specifier, context, next) {
  if (specifier === '#database-worker') {
    return {
      url: 'data:text/javascript,export default () => globalThis.__squeakliteTestWorker',
      shortCircuit: true,
    };
  }
  return next(specifier, context);
}

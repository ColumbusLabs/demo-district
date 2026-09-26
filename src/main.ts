import { mountApplication } from './app/bootstrap';

let unmount = mountApplication(document);
if (import.meta.hot) {
  // Accept world/bootstrap updates without accumulating renderers or frame loops.
  import.meta.hot.accept('./app/bootstrap', (module) => {
    unmount();
    if (module) unmount = module.mountApplication(document);
  });
  import.meta.hot.dispose(() => unmount());
}

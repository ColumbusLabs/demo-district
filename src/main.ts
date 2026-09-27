import { mountApplication } from './app/bootstrap';
import { createLoading } from './ui/loading';

// A development-only still for visual review; absent from the published bundle.
const arrivalPreview = import.meta.env.DEV ? new URLSearchParams(location.search).get('arrival-preview') : null;
let unmount: () => void;
if (arrivalPreview !== null) {
  const arrival = createLoading(document);
  arrival.setProgress(Number(arrivalPreview), 'Lighting up the storefronts…');
  unmount = arrival.destroy;
} else {
  unmount = mountApplication(document);
}
if (import.meta.hot) {
  import.meta.hot.accept('./app/bootstrap', (module) => {
    unmount();
    if (module) unmount = module.mountApplication(document);
  });
  import.meta.hot.dispose(() => unmount());
}

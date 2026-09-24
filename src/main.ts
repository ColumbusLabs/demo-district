import { mountApplication } from './app/bootstrap';

const dispose = mountApplication(document);
import.meta.hot?.dispose(dispose);

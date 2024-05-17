import { Spinner } from './components/spin';

export function createSpiner(target) {
    const opts = {
      display: 'flex',
      jContent: 'center',
      alItems: 'center',
      top: '50%',
      left: '50%',
      zIndex: 2000000000,
      position: 'fixed',
      logo: true,
    };

    $('.background-overlay').removeClass('hidden');
    const sp = new Spinner(opts).spin(target);
    return sp;
}

export function removeSpiner(spiner) {
  spiner.stop();
  $('.background-overlay').addClass('hidden');
}

export function extractContent(html, elementId) {
  const DOMModel = new DOMParser().parseFromString(html, 'text/html');
  return DOMModel.getElementById(elementId)?.innerHTML;
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}

export default generateUUID;
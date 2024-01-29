import { Spinner } from './components/spin';

export function createSpiner(target) {
    const opts = {
      lines: 7, // The number of lines to draw
      length: 0, // The length of each line
      width: 12, // The line thickness
      radius: 20, // The radius of the inner circle
      scale: 1, // Scales overall size of the spinner
      corners: 1, // Corner roundness (0..1)
      speed: 0.8, // Rounds per second
      rotate: 0, // The rotation offset
      animation: 'spinner-line-fade-default', // The CSS animation name for the lines
      direction: 1, // 1: clockwise, -1: counterclockwise
      color: '#000000', // CSS color or array of colors
      fadeColor: 'transparent', // CSS color or array of colors
      top: '50%', // Top position relative to parent
      left: '50%', // Left position relative to parent
      shadow: '0 0 1px transparent', // Box-shadow for the lines
      zIndex: 2000000000, // The z-index (defaults to 2e9)
      className: 'spinner', // The CSS class to assign to the spinner
      position: 'absolute', // Element positioning
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
export const levels = [
  {title:'A simple yes or no.',instruction:'Would you like to NOT begin the game?',hint:'Two negatives. One very annoying answer. Pick No.'},
  {title:'Your eyes are lying.',instruction:'Select the word BLUE. Not the colour blue.',hint:'Read the letters. Ignore the ink.'},
  {title:'Password, please.',instruction:'Type “please”. Our keyboard has a different opinion.',hint:'The input reverses your entire answer. Type esaelp.'},
  {title:'We value your privacy.',instruction:'Decline every completely unnecessary permission.',hint:'Uncheck all six boxes, then save your preferences.'},
  {title:'Turn it up. Or down.',instruction:'Set the volume to exactly 37.',hint:'The slider runs backwards. The minus and plus buttons are honest.'},
  {title:'Do absolutely nothing.',instruction:'For four seconds. You can handle that, right?',hint:'Leave the big button alone. Wait until the receipt button appears.'},
  {title:'Remember this forever.',instruction:'Memorise the sequence. The buttons will rearrange.',hint:'The sequence is 3 → 1 → 4 → 2. Read each button before clicking.'},
  {title:'Prove you are human.',instruction:'Select the human. We outsourced the instructions.',hint:'The little word “human” underneath the grid is also a button.'},
  {title:'Just some light reading.',instruction:'Read the terms. Then make a sensible decision.',hint:'Scroll INSIDE the terms box to the bottom. Then disagree.'},
  {title:'The exit interview.',instruction:'Finish the game. It would be weird if this were a trap.',hint:'Finish opens a confirmation. Confirm three times, then Cancel.'}
];
export function correctAnswer(level, value, state = {}) {
  switch (level) {
    case 0: return value === 'no';
    case 1: return value === 'blue';
    case 2: return value === 'esaelp';
    case 3: return state.selected === 0;
    case 4: return state.value === 37;
    case 5: return state.elapsed >= 4000 && state.clicked === false;
    case 6: return value === '3142';
    case 7: return value === 'human';
    case 8: return state.bottom === true && value === 'disagree';
    case 9: return state.confirmations >= 3 && value === 'cancel';
    default: return false;
  }
}

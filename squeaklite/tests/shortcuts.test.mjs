import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commandEnter,plainCharacter,ignoredKey,shortcutLabels} from '../src/shortcuts.mjs';

test('Command and Control Enter accept main/numpad, exclude unrelated modifiers',()=>{
 for(const modifier of ['metaKey','ctrlKey'])for(const enter of [{key:'Enter'},{key:'Unidentified',code:'NumpadEnter'},{code:'Enter'}])assert.ok(commandEnter({...enter,[modifier]:true}));
 for(const e of [{key:'Enter'},{key:'Enter',metaKey:true,altKey:true},{key:'Enter',ctrlKey:true,shiftKey:true},{key:'x',metaKey:true}])assert.ok(!commandEnter(e));
 assert.ok(plainCharacter({key:'?',shiftKey:true}));assert.ok(!plainCharacter({ctrlKey:true,altKey:true}));
 for(const e of [{repeat:true},{isComposing:true},{keyCode:229},{defaultPrevented:true}])assert.ok(ignoredKey(e));
 assert.equal(shortcutLabels({platform:'MacIntel'}).run,'⌘ Enter');assert.equal(shortcutLabels({platform:'Linux x86_64'}).run,'Ctrl Enter');
});

// elements
let eventLogElement = document.getElementById("eventLog");
let eventLogList = []; // model for the log element
eventLogList.length = eventLogElement.rows; // initialize model
let deviceSelectElement = document.getElementById("deviceSelect");
let keyboardLayoutSelectElement = document.getElementById("keyboardLayoutSelect");
let keyboardLayoutsList = { // these layouts are in "keyboardLayoutsList.js"
    "major3rdsInvertedLayout": major3rdsInvertedLayout,
    "melodicLayout": melodicLayout,
    "melodicLayout2": melodicLayout2,
    "tritoneLayout": tritoneLayout,
    "perfect4thsLayout": perfect4thsLayout,
    "wholeToneScaleLayout": wholeToneScaleLayout,
    "minor3rdsLayout": minor3rdsLayout,
    "diatonicLayout": diatonicLayout,
}

// midi
let midiOutputPort;
let midiChannel = 0; // <--- channel 1
let midiVelocityNormal = 90;
let midiVelocityAccented = 127;
let midiNoteOnStatus = 144;
let midiNoteOffStatus = 128;
let midiProgramChangeStatus = 192;
let midiCurrentProgram = 0;
let midiPitchTranspose = 60;
let pressedKeys = {};
let allNoteOff = [];
for (let i = 0; i < 16; ++i) {
    let c = [];
    for (j = 0; j < 128; j++) {
        c.push(midiNoteOffStatus + i);
        c.push(j);
        c.push(0);
    }
    allNoteOff.push(c);
}
// which layout we're currently in
// (it's initialized to whatever the first available layout is)
let key2MidiPitch;


// after the window is loaded, wire all the respective callbacks
window.onload = function() {

    // check if midi available
    if (navigator.requestMIDIAccess) {
        // request midi access (on success)
        navigator.requestMIDIAccess().then(midiAccessSuccess, midiAccessFailure);
    }

    // attach callback to device select
    deviceSelectElement.addEventListener("change", handleDeviceSelectOnChange);

    // populate keyboard layout select
    populateKeyboardLayoutSelect()
    // select the first option in the available layouts
    keyboardLayoutSelectElement.selectedIndex = "0";
    // set our key to midi-note hashmap to the selected option
    key2MidiPitch = keyboardLayoutsList[keyboardLayoutSelectElement.value]

    // attach callback to keyboard layout select
    keyboardLayoutSelectElement.addEventListener("change", handleKeyboardLayoutSelectOnChange);

    // connect key presses to midi note on events
    window.addEventListener("keydown", handleKeyDown);

    // connect key releases to midi note off events
    window.addEventListener("keyup", handleKeyUp);
}

// callback for window key releases ("keyup" events)
function handleKeyUp(e) {
    handleReleaseMidi(e);
}

// callback for window key presses ("keydown" events)
// this is basically a painfully large switch statement
function handleKeyDown(e) {
    // trigger midi events if the key is in the layout
    handlePressMidi(e);

    // turn off all notes if backspace/delete is pressed
    if (e.keyCode == 8 || e.keyCode == 46) {
        turnOffAllNotes(midiOutputPort);
        // LOGGING
        appendToEventLog("panic   ", "");
        return;
    }

    // octave down/up          => arrow down/up
    // semitone down/up        => arrow left/right
    // midi channel down/up    => ctrl-left or ctrl-right
    // program changes down/up => page down/up
    // keyboard layout down/up => ctrl-down or ctrl-up
    switch (e.keyCode) {

        case 40: // down
            if (e.ctrlKey) {
                // (keyboard layout decrement)
                // edge case: length <= selectedIndex wil crash everything
                if (keyboardLayoutSelectElement.selectedIndex < (keyboardLayoutSelectElement.length - 1)) {
                    keyboardLayoutSelectElement.selectedIndex++;
                } else {
                    keyboardLayoutSelectElement.selectedIndex = 0;
                }
                key2MidiPitch = keyboardLayoutsList[keyboardLayoutSelectElement.value];
                appendToEventLog("layout", "down");
            } else {
                // (octave decrement)
                if (midiPitchTranspose > 12) {
                    midiPitchTranspose -= 12;
                    // LOGGING
                    appendToEventLog("-12", "");
                }
            }
            break;

        case 38: // up
            if (e.ctrlKey) {
                // (keyboard layout increment)
                // selectedIndex == -1 means no selection
                keyboardLayoutSelectElement.selectedIndex--;
                if (keyboardLayoutSelectElement.selectedIndex < 0) {
                    keyboardLayoutSelectElement.selectedIndex = (keyboardLayoutSelectElement.length - 1);
                }
                key2MidiPitch = keyboardLayoutsList[keyboardLayoutSelectElement.value];
                appendToEventLog("layout", "up");
            } else {
                // (octave increment)
                if (midiPitchTranspose < 96) {
                    midiPitchTranspose += 12;
                    // LOGGING
                    appendToEventLog("+12", "");
                }
            }
            break;

        case 37: // left
            if (e.ctrlKey) {
                // (midi channel decrement)
                if (midiChannel > 0) {
                    midiChannel -= 1;
                    // LOGGING
                    appendToEventLog("channel", "" + (midiChannel + 1));
                }
            } else {
                // (semitone decrement)
                if (midiPitchTranspose > 12) {
                    midiPitchTranspose -= 1;
                    // LOGGING
                    appendToEventLog("-1", "");
                }
            }
            break;

        case 39: // right
            if (e.ctrlKey) {
                // (midi channel increment)
                if (midiChannel < 15) {
                    midiChannel += 1;
                    // LOGGING
                    appendToEventLog("channel", "" + (midiChannel + 1));
                }
            } else {
                // (semitone increment)
                if (midiPitchTranspose < 96) {
                    midiPitchTranspose += 1;
                    // LOGGING
                    appendToEventLog("+1", "");
                }
            }
            break;


        case 33: // page up (program change to next patch)
            if (midiCurrentProgram < 127) {
                midiCurrentProgram += 1;
                midiOutputPort.send([midiProgramChangeStatus + midiChannel, midiCurrentProgram]);
                // LOGGING
                appendToEventLog("program change", "" + (midiCurrentProgram + 1));
            }
            break;

        case 34: // page down (program change to prior patch)
            if (midiCurrentProgram > 0) {
                midiCurrentProgram -= 1;
                midiOutputPort.send([midiProgramChangeStatus + midiChannel, midiCurrentProgram]);
                // LOGGING
                appendToEventLog("program change", "" + (midiCurrentProgram + 1));
            }
            break;
    }

}

// lovingly modified from here:
// https://webaudio.github.io/web-midi-api/#listing-inputs-and-outputs
function listInputsAndOutputs(midiAccess) {
    for (var entry of midiAccess.inputs) {
        // log this device
        var input = entry[1];
        console.log("Input port [type:'" + input.type + "'] id:'" + input.id +
            "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
            "' version:'" + input.version + "'");
    }
    for (var entry of midiAccess.outputs) {
        // log this device
        var output = entry[1];
        console.log("Output port [type:'" + output.type + "'] id:'" + output.id +
            "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
            "' version:'" + output.version + "'");
    }
}

function populateDeviceSelect(midiAccess) {
    for (var entry of midiAccess.outputs) {
        // append to device select element
        var output = entry[1];
        let option = document.createElement("option");
        option.text = output.name;
        deviceSelectElement.add(option);
    }
}

function populateKeyboardLayoutSelect(midiAccess) {
    for (var layoutName in keyboardLayoutsList) {
        let option = document.createElement("option");
        option.text = layoutName
        keyboardLayoutSelectElement.add(option);
    }
}

// callback to run when a new midi device is selected
function handleDeviceSelectOnChange(e) {
    let v = deviceSelectElement.value;
    for (let entry of midiSystem.outputs) {
        output = entry[1];
        if (output.name == v) {
            turnOffAllNotes(midiOutputPort)
            midiOutputPort = output;
            return;
        }
    }
}

// callback to run when a new keyboard layout is selected
function handleKeyboardLayoutSelectOnChange(e) {
    let v = keyboardLayoutSelectElement.value;
    let layout = keyboardLayoutsList[v];
    //NB. active notes (note_on) will possibly become unreachable for deactivation 
    //(note off) in a layout change.  If so, just hit the panic button.
    key2MidiPitch = layout;
}


// callback to run on midi access availability
function midiAccessSuccess(midi) {
    listInputsAndOutputs(midi);
    // save reference to midi output port (which our callbacks will send data through)
    // this is a hacky... method to get the first value of the outputs map (works on ubuntu at least)
    midiOutputPort = midi.outputs.get(midi.outputs.keys().next().value);
    // save reference to entire midi system (for debugging)
    midiSystem = midi;
    // populate the device select element with midi output devices
    populateDeviceSelect(midi);
}

// callback to run on midi access inavailability
function midiAccessFailure() {
    console.error(midiErrorString)
    // register a dummy object for midiOutput so our callbacks 
    // don't keep accessing undefined
    midiOutputPort = {
        send: function() {
            console.error("Midi is unavailable");
        }
    };
}

function turnOffAllNotes(midiOutputPort) {
    for (let i = 0; i < allNoteOff.length; ++i) {
        // stutter the midi note deluge to not overwhelm synths
        setTimeout(function() {
            midiOutputPort.send(allNoteOff[i]);
            console.log("turned off channel: ", i + 1);
        }, i * 10);
    }
}

function appendToEventLog(level, s) {
    // format string, this is a hack
    // found here:
    // https://stackoverflow.com/questions/2686855/is-there-a-javascript-function-that-can-pad-a-string-to-get-to-a-determined-leng
    level = ("                " + level).slice(-16)
    s = ("               " + s).slice(15);
    // update event log model
    eventLogList.unshift(level + " " + s);
    eventLogList.pop();
    // update event log view
    eventLogElement.value = eventLogList.join("\n");
}

function handlePressMidi(e) {
    // if this key is in the layout
    let midiPitch = key2MidiPitch[e.key]
    if (midiPitch !== undefined) {
        // if this key is not already pressed
        if (!pressedKeys[e.key]) {
            // add key to pressedKeys
            pressedKeys[e.key] = true;
            // send midi note on
            midiOutputPort.send([
                midiNoteOnStatus + midiChannel,
                midiPitch + midiPitchTranspose,
                midiVelocityNormal
            ]);
            // LOGGING
            let midiNumber = midiPitch + midiPitchTranspose
            appendToEventLog("note_on ", midiNumberToName(midiNumber))
        }
    }
}

function handleReleaseMidi(e) {
    // if this key is in the layout
    let midiPitch = key2MidiPitch[e.key]
    if (midiPitch !== undefined) {
        // if key is in pressedKeys
        if (pressedKeys[e.key]) {
            // remove it from pressedKeys
            pressedKeys[e.key] = undefined;
            // send midi note off
            midiOutputPort.send([
                midiNoteOffStatus + midiChannel,
                midiPitch + midiPitchTranspose,
                0
            ]);
            // LOGGING
            let midiNumber = midiPitch + midiPitchTranspose
            appendToEventLog("note_off", midiNumberToName(midiNumber))
        }
    }
}

// convert midi numbers to their corresponding note value with 60 => "C4"
function midiNumberToName(n) {
    let noteNames = [
        "C-",
        "C#",
        "D-",
        "D#",
        "E-",
        "F-",
        "F#",
        "G-",
        "G#",
        "A-",
        "A#",
        "B-",
    ]
    let octaves = Math.floor(n / 12) - 1
    return noteNames[n % 12] + octaves
}

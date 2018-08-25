// elements
let deviceSelectElement = document.getElementById("deviceSelect");
let eventLogElement = document.getElementById("eventLog");
let eventLogList = []; // model for the log element
eventLogList.length = eventLogElement.rows; // initialize model

// midi
let midiOutputPort;
let midiChannel = 0; // <--- channel 1
let midiVelocityNormal = 90;
let midiVelocityAccented = 127;
let midiNoteOnStatus = 144;
let midiNoteOffStatus = 128;
let midiProgramChangeStatus = 192;
let midiCurrentProgram = 0;
let midiPitchTranspose = 24;
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

let diminishedScaleLayout = {
    // col 1
    "z": 0,
    "a": 1,
    "q": 2,
    "1": 3,
    // col 2
    "x": 3,
    "s": 4,
    "w": 5,
    "2": 6,
    // col 3
    "c": 6,
    "d": 7,
    "e": 8,
    "3": 9,
    // col 4
    "v": 9,
    "f": 10,
    "r": 11,
    "4": 12,
    // col 5
    "b": 12,
    "g": 13,
    "t": 14,
    "5": 15,
    // col 6
    "n": 15,
    "h": 16,
    "y": 17,
    "6": 18,
    // col 7
    "m": 18,
    "j": 19,
    "u": 20,
    "7": 21,
    // col 8
    ",": 21,
    "k": 22,
    "i": 23,
    "8": 24,
    // col 9
    ".": 24,
    "l": 25,
    "o": 26,
    "9": 27,
    // col 10
    "/": 27,
    ";": 28,
    "p": 29,
    "0": 30,
    // col 11 (somewhat incomplete)
    "'": 31,
    "[": 32,
    "-": 33,
    // col 12 (somewhat incomplete)
    "]": 35,
    "=": 36,
}
let key2MidiPitch = diminishedScaleLayout;

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

// after the window is loaded
// // basically the main() function
window.onload = function() {

    // check if midi available
    if (navigator.requestMIDIAccess) {
        // request midi access (on success)
        navigator.requestMIDIAccess().then(midiAccessSuccess, midiAccessFailure);
    }

    // attach callback to device select
    deviceSelectElement.addEventListener("change", handleDeviceSelectOnChange);

    // connect key presses to midi note on events
    window.addEventListener("keydown", function(e) {
        // trigger midi events if the key is in the layout
        handlePressMidi(e);

        // turn off all notes if backspace/delete is pressed
        if (e.keyCode == 8 || e.keyCode == 46) {
            turnOffAllNotes(midiOutputPort);
            // LOGGING
            appendToEventLog("panic   ", "");
            return;
        }

        // shift octaves down or up if left or right arrow is pressed respectively
        // shift midi channels down or up if down or up arrow is pressed respectively
        // send program changes if page down/up is pressed
        switch (e.keyCode) {

            // down (octave decrement)
            case 40:
                if (midiPitchTranspose > 12) {
                    midiPitchTranspose -= 12;
                    // LOGGING
                    appendToEventLog("-12", "");
                }
                break;

                // up (octave increment)
            case 38:
                if (midiPitchTranspose < 96) {
                    midiPitchTranspose += 12;
                    // LOGGING
                    appendToEventLog("+12", "");
                }
                break;

                // // left (semitone decrement)
                // case 39:
                // if (midiChannel < 15) {
                //     midiChannel += 1;
                //     // LOGGING
                //     appendToEventLog("-1 ", "");
                // }
                // break;

                // // right (semitone increment)
                // case 37:
                // if (midiChannel > 0) {
                //     midiChannel -= 1;
                //     // LOGGING
                //     appendToEventLog("+1 ", "");
                // }
                // break;

                // shift-left (midi channel change decrement)
            case 39:
                if (midiChannel < 15) {
                    midiChannel += 1;
                    // LOGGING
                    appendToEventLog("channel ", "" + (midiChannel + 1));
                }
                break;

                // right (midi channel change increment)
            case 37:
                if (midiChannel > 0) {
                    midiChannel -= 1;
                    // LOGGING
                    appendToEventLog("channel ", "" + (midiChannel + 1));
                }
                break;

                // page up (program change to next patch)
            case 33:
                if (midiCurrentProgram < 127) {
                    midiCurrentProgram += 1;
                    midiOutputPort.send([midiProgramChangeStatus + midiChannel, midiCurrentProgram]);
                    // LOGGING
                    appendToEventLog("program change", "" + (midiCurrentProgram + 1));
                }
                break;

                // page down (program change to prior patch)
            case 34:
                if (midiCurrentProgram > 0) {
                    midiCurrentProgram -= 1;
                    midiOutputPort.send([midiProgramChangeStatus + midiChannel, midiCurrentProgram]);
                    // LOGGING
                    appendToEventLog("program change", "" + (midiCurrentProgram + 1));
                }
                break;
        }

    });

    // connect key releases to midi note off events
    window.addEventListener("keyup", function(e) {
        handleReleaseMidi(e);
    });
}

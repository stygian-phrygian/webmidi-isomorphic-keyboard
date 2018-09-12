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

let key2MidiPitch = majorThirdLayout;

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

        // octave down/up          => arrow down/up
        // semitone down/up        => arrow left/righ
        // midi channel down/up    => ctrl-left or ctrl-right
        // program changes down/up => page down/up
        switch (e.keyCode) {

            case 40: // down 
                // (octave decrement)
                if (midiPitchTranspose > 12) {
                    midiPitchTranspose -= 12;
                    // LOGGING
                    appendToEventLog("-12", "");
                }
                break;

            case 38: // up 
                // (octave increment)
                if (midiPitchTranspose < 96) {
                    midiPitchTranspose += 12;
                    // LOGGING
                    appendToEventLog("+12", "");
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

    });

    // connect key releases to midi note off events
    window.addEventListener("keyup", function(e) {
        handleReleaseMidi(e);
    });
}

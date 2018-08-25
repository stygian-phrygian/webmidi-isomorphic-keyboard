# WebMIDI Isomorphic Keyboard
Turn your computer keyboard into a MIDI keyboard.

## Usage
* Open index.html in your browser(Google Chrome is the only [current] browser with WebMIDI)
* Select the MIDI output device (one is already selected by default).
* Recently triggered events are displayed in the Event Log.

## Keybindings
```
    letter/numbers       => MIDI note on/off
    down/up              => octave down/up
    left/right           => semitone down/up
    ctrl-left/ctrl-right => MIDI channel down/up
    page down/up         => MIDI program-change prior/next
    backspace/delete     => turn off all notes (if notes get stuck)
```

## Note Layout
* All the ascii letters and numbers represent pitches.
* The midi pitches are arranged uniformly (similar to a guitar tuned in minor 3rds)

## Screenshot
![screenshot](screenshot.png)


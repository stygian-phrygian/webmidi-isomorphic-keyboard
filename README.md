# WebMIDI Isomorphic Keyboard
Turn your computer keyboard into a MIDI keyboard.

## Usage
* Open index.html in your browser(Google Chrome is the only [current] browser with WebMIDI)
* Select the MIDI output device (one is already selected by default).
* Recently triggered events are displayed in the Event Log.

## Keybindings
* press/release letter or number keys => MIDI notes will be triggered.
* ctrl-left/ctrl-right                => MIDI channel down/up 
* down/up                             => octave down/up 
* left/right                          => semitone down/up
* backspace/delete                    => turn off all midi notes (useful if notes get stuck).
* page down/up                        => prior/next patch (program change)

## Note Layout
* All the ascii letters and numbers represent pitches.
* The midi pitches are arranged uniformly (similar to a guitar tuned in minor 3rds)

## Screenshot
![screenshot](screenshot.png)


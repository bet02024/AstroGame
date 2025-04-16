import Betting from './scenes/Betting';
import MainMenu from './scenes/MainMenu';
import Phaser from 'phaser';

// Find out more information about the Game Config at:
// https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#ffffff',
    disableContextMenu: true,
    render: {
        pixelArt: true
    },
    physics: {
        default: "arcade"
    },
    scale: {
        mode: Phaser.Scale.ScaleModes.FIT,
        autoCenter: Phaser.Scale.Center.CENTER_HORIZONTALLY
    },
    scene: [ 
        MainMenu,
        Betting
    ]
};

const StartGame = (parent) => {
    return new Phaser.Game({ ...config, parent });
}

export default StartGame;

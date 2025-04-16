/* START OF COMPILED CODE */
import Phaser from "phaser";
/* START-USER-IMPORTS */
import { EventBus } from '../EventBus';
/* END-USER-IMPORTS */

export default class MainMenu extends Phaser.Scene {

	constructor() {
		super("MainMenu");
	}

    preload () {
        this.load.pack('preload', 'assets/preload-asset-pack.json');
        this.load.spritesheet('fire', 'assets/firespritesheet.png', {
			frameWidth: 128,   
			frameHeight: 128  
		});
        this.load.spritesheet('axo', 'assets/astro.png', {
			frameWidth: 102,   
			frameHeight: 302  
		});
        this.load.spritesheet('explosion', 'assets/explosion_spritesheet.png', {
			frameWidth: 256,   
			frameHeight: 256  
		});

        this.load.spritesheet('won', 'assets/won.png', {
			frameWidth: 150,   
			frameHeight: 150  
		});
        
    }

	/** @returns {void} */
	editorCreate() {

		// background
		this.add.image(400, 300, "background");
        const stars = this.add.image(400, 0, "stars");
        const stars2 = this.add.image(300, 100, "stars2"); 
        //stars.setScale(0.4,0.4);        
        //stars2.setScale(0.4,0.4);

        const coin = this.add.image(40, 30, 'coin');
        const ticket = this.add.image(40, 80, 'ticket');
        coin.setScale(0.08,0.08);
        ticket.setScale(0.15,0.15);
        const coins = this.add.text(70, 12, "", {});
		coins.text = "0";
		coins.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "30px", "stroke": "#000000", "strokeThickness":0});
        const tickets = this.add.text(70, 63, "", {});
		tickets.text = "0";
		tickets.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "30px", "stroke": "#000000", "strokeThickness":0});

        const profitText = this.add.text(550, 12, "", {});
        profitText.text = "";
        profitText.setStyle({ "align": "center", "color": "#A0D683", "fontFamily": "Pixellari", "fontSize": "25px", "stroke": "#000000", "strokeThickness":0});
        const curretBetText = this.add.text(550, 63, "", {});
        curretBetText.text = "";
		curretBetText.setStyle({ "align": "center", "color": "#87A2FF", "fontFamily": "Pixellari", "fontSize": "25px", "stroke": "#000000", "strokeThickness":0});
        const dice = this.add.image(530, 78, "dice");
		dice.setScale(0.1,0.1);
        dice.setVisible(false);

       
        const button = this.add.image(400, 145, 'button2');
        button.setInteractive();
        button.on('pointerdown', () => {
            this.won.play('won');
		    this.won.setVisible(true);
            EventBus.emit('cashaout-click', this);
            this.tweens.add({
                targets: this.axo,       
                x: 140,                
                y: 530,              
                scaleX: 0.3,             // The final scale in the X direction (2x larger)
                scaleY: 0.3,   
                duration: 1500,        
                ease: 'Quint.easeOut',  
            });
            this.time.delayedCall(3000, this.delayedActionWon, [], this);
        });
        button.on('pointerover', () => {
            button.setTint(0x44ff44);  // Change color on hover
        });
        button.on('pointerout', () => {
            button.clearTint();  // Remove the color when not hovering
        });

        const cashoutText = this.add.text(320, 125, "", {});
		cashoutText.text = "Cashout";
		cashoutText.setStyle({ "align": "center", "color": "#ffffff", "fontFamily": "Pixellari", "fontSize": "38px", "stroke": "#000000", "strokeThickness":1});

        const multipliers = this.add.text(300, 220, "", {});
		multipliers.text = "1x";
		multipliers.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "38px", "stroke": "#000000", "strokeThickness":1});

        this.anims.create({
			key: 'axo',  
			frames: this.anims.generateFrameNumbers('axo', { start: 0, end: 3 }),  // Frame range
			frameRate: 4,
			repeat: -1
		});
        const axo = this.add.sprite(555, 430, 'axo');
		axo.play('axo');

        const rocket = this.add.image(600, 450, "rocket");
		this.rocket = rocket;
        
        this.anims.create({
			key: 'fire',  
			frames: this.anims.generateFrameNumbers('fire', { start: 0, end: 5 }),  // Frame range
			frameRate: 3,  // Frames per second
			repeat: -1      // Loop the animation indefinitely
		});

		const fire = this.add.sprite(600, 580, 'fire');
		fire.play('fire');
		fire.setVisible(false);
        fire.angle = 180;
        fire.setScale(0.9,1.3);

        this.anims.create({
			key: 'won',  
			frames: this.anims.generateFrameNumbers('won', { start: 0, end: 59 }),  // Frame range
			frameRate: 20,   
			repeat: 1
		});

        const won = this.add.sprite(400, 130, 'won');
        won.setScale(3,3);
        won.setVisible(false);
        
        this.anims.create({
			key: 'explosion',  
			frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 9 }),
			frameRate: 3,
			repeat: 1
		});

        const explosion = this.add.sprite(600, 420, 'explosion');
        explosion.setScale(2.5,2.5);
        explosion.setVisible(false);

        this.crashMultiplier = 0;
        this.profit = 0;
        this.multiplierCash = 0;
        this.currentBet = 0;

        this.physics.add.existing(stars, false);
        this.physics.add.existing(stars2, false);
        stars.body.velocity.y = 20;
        stars2.body.velocity.y = 50;
        this.fire = fire;
        this.won = won;
        this.axo = axo;
        this.explosion = explosion;
        this.stars = stars;
        this.stars2 = stars2;
        this.button = button;
        this.cashoutText = cashoutText;
        this.multipliers = multipliers;
        this.coins =  coins;
        this.tickets = tickets;
        this.profitText = profitText;
        this.curretBetText = curretBetText; 
        this.dice = dice;


		this.events.emit("scene-awake");
	}

	/** @type {Phaser.GameObjects.Image} */
	rocket;
    multiplier;
    stars;
    stars2;
    coins;
    tickets;
    activeBet =false;
    isGameActive = false;
    button;
    currentBet =0;
    profit =0;
    multiplierCash =0;
    crashMultiplier =0;
    profitText;
    curretBetText;
    cashoutText;
    fire;
    explosion;
    won;
    axo;
    dice;


    update() {
        if (this.stars2.y >= 900) {
            this.stars2.y = -200;
        }
        if (this.stars.y >= 900) {
            this.stars.y = -200;
        }
    }


	// Write your code here
    create ()
    {
        this.editorCreate();
        EventBus.emit('current-scene-ready', this, "MainMenu");
    }

    setActiveBet(isBetActive, isBettingPhase, globalTimeNow){
        this.activeBet = isBetActive;
        //console.log(" setActiveBet", (Date.now() - globalTimeNow) / 1000.0, isBetActive, isBettingPhase);
        if(isBetActive){
            this.button.setInteractive();
            this.button.setVisible(true);
            this.cashoutText.setVisible(true);
            this.won.setVisible(false);
        } else {
            if (isBettingPhase){
                this.profitText.text = "";
                this.curretBetText.text = "";
                this.dice.setVisible(false);
                this.multipliers.text = "";
                this.explosion.play('explosion');
		        this.explosion.setVisible(true);
                this.rocket.setVisible(false);
                this.fire.setVisible(false);
                if(parseFloat(this.profit) == 0){
                    this.axo.setVisible(false);
                }
                if((Date.now() - globalTimeNow) / 1000.0 < 1.0){
                    this.time.delayedCall(3000, this.delayedAction, [], this);
                } else {
                    this.scene.restart();
                    this.scene.start('Betting');
                }
            } else {
                this.button.disableInteractive();
                this.button.setVisible(false);
                this.cashoutText.setVisible(false);
            }
        }
    }

    delayedActionWon() {
        this.won.setVisible(false);
    }

    delayedAction() {
        this.scene.restart();
        this.scene.start('Betting');
    }

    updateScore(_coins, _tickets, _limit, _currentBet, _profit, _multiplier, _crashMultiplier){
             this.coins.text =   "$" +   new Intl.NumberFormat().format(parseFloat(_coins));
            this.tickets.text = _tickets;
            this.multiplierCash = _multiplier;
            this.crashMultiplier = _crashMultiplier;
            this.profit = _profit;
            this.dice.setVisible(true);
            this.curretBetText.setX(550);
            this.dice.setX(530);

            if (_currentBet == 0){
                this.curretBetText.text = "Staked $" + _currentBet + " (Not playing)";
                this.curretBetText.setX(250);
                this.dice.setX(230);
            } else {
                this.curretBetText.text = "Staked $" + _currentBet;
            }

            if (_currentBet > 0 && _multiplier>0){
                this.curretBetText.text = "$" + _currentBet +  "x(" + _multiplier + ")";
            }
            if (parseFloat(_profit) > 0){
                this.profitText.text = "Profit $" +  new Intl.NumberFormat().format( parseFloat(_profit) - parseFloat(_currentBet));
            } else {
                this.profitText.text = "";
            }
            this.currentBet = _currentBet;
        
    }

    changeText(text){
            if(text.includes("X")){
                this.multipliers.text = text;
                this.fire.setVisible(true);
                this.rocket.setVisible(true);
                this.axo.setVisible(true);
    
                if(this.activeBet){
                    this.cashoutText.setStyle({ "align": "center", "color": "#ffffff", "fontFamily": "Pixellari", "fontSize": "38px", "stroke": "#000000", "strokeThickness":1});
                    this.cashoutText.text = "Cashout";
                    this.cashoutText.setX(320);
                    this.button.setVisible(true);
                    this.button.setInteractive();
                } else {
                    this.cashoutText.text = "";
                    this.button.setVisible(false);
                }
                let value = parseFloat(text);
                this.multipliers.setScale(Math.log10(value) + 1);
                this.multipliers.setX(400 - this.multipliers.width * (Math.log10(value) + 1) / 2);
            } else {
                this.multipliers.setScale(1);
                this.cashoutText.setVisible(true);
                this.multipliers.text = "";
                this.button.disableInteractive();
                this.button.setVisible(false);
                this.rocket.setVisible(false);
                this.fire.setVisible(false);
                if(parseFloat(this.profit) == 0){
                    this.axo.setVisible(false);
                }
                this.cashoutText.text = "Crashed @ " + this.crashMultiplier + "x";
                this.cashoutText.setX(210);
                this.cashoutText.setStyle({ "align": "center", "color": "#FF0000", "fontFamily": "Pixellari", "fontSize": "45px", "stroke": "#000000", "strokeThickness":1});
            }
        
    }

}

/* END OF COMPILED CODE */

// You can write more code here

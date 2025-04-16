
/* START OF COMPILED CODE */
import Phaser from "phaser";
/* START-USER-IMPORTS */
import { EventBus } from '../EventBus';
/* END-USER-IMPORTS */

export default class Betting extends Phaser.Scene {

	/** @type {Phaser.GameObjects.Image} */
	coins;
	tickets;
	activeBet =false;
	isGameActive = false;
	button;	
	buttonText;
	sliderHandle;
    sliderTrack;
    sliderValueText;
	sliderValue=1;
	next;
	limit=0;
	limits;
	currentBet =0;
	curretBetText;
	bettingText;
	wait;
	prepare;
	dice;

	constructor() {
		super("Betting");
	}

	preload () {
        this.load.pack('preload', 'assets/preload-asset-pack.json');
		this.load.spritesheet('wait', 'assets/waitspritesheet.png', {
			frameWidth: 102,   
			frameHeight: 102  
		});
    }

	/** @returns {void} */
	editorCreate() {

		this.add.image(400, 300, "background");

		const sliderTrack = this.add.image(400, 210, 'bar').setInteractive();

		const sliderHandle = this.add.circle(130, 210, 30, 0xffffff);
		sliderHandle.setInteractive();
		this.input.setDraggable(sliderHandle);

		sliderTrack.on('pointerdown', (pointer) => {
			const newX = Phaser.Math.Clamp(pointer.downX, this.sliderTrack.x - this.sliderTrack.width / 2, this.sliderTrack.x + this.sliderTrack.width / 2);
			this.updateSliderValue(newX);
			this.sliderHandle.x = newX;
			this.sliderValueText.setX(newX -20);
		});

		const sliderValueText = this.add.text(145, 195, '', { font: '25px Pixellari', fill: '#000000' });
		this.input.on('drag', (pointer, gameObject, dragX) => {
			if (dragX >= 130 && dragX <= 670) {
				this.sliderHandle.x = dragX;  // Update handle position
				this.updateSliderValue(dragX);  // Update value based on the handle's position
				this.sliderValueText.setX(dragX -20);
			}
		});

		const button = this.add.image(400, 305, 'button2');
        button.setInteractive();
        button.on('pointerdown', () => {
            EventBus.emit('place-bet-click', this, this.sliderValue);
        });
        button.on('pointerover', () => {
            button.setTint(0x44ff44);  // Change color on hover
        });
        button.on('pointerout', () => {
            button.clearTint();  // Remove the color when not hovering
        });
		button.setScale(1.15,1.15);

		const buttonText = this.add.text(330, 290, 'Play', { align: "center", font: '30px Pixellari', fill: '#ffffff' });
		this.buttonText = buttonText;

		const coin = this.add.image(40, 30, 'coin');
        const ticket = this.add.image(40, 80, 'ticket');
		coin.setScale(0.08,0.08);
        ticket.setScale(0.15,0.15);
		// text
		const coins = this.add.text(70, 12, "", {});
		coins.text = "0";
		coins.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "30px", "stroke": "#000000", "strokeThickness":1});
        const tickets = this.add.text(70, 63, "", {});
		tickets.text = "0";
		tickets.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "30px", "stroke": "#000000", "strokeThickness":1});

		const next = this.add.text(300, 480, "", {});
		next.text = "";
		next.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "38px", "stroke": "#000000", "strokeThickness":1});
       
		const limits = this.add.text(610, 110, "", {});
		limits.text = "";
		limits.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "13px", "stroke": "#000000", "strokeThickness":1});


		const curretBetText = this.add.text(550, 63, "", {});
        curretBetText.text = "";
		curretBetText.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "30px", "stroke": "#000000", "strokeThickness":1});



		const dice = this.add.image(280, 120, "dice");
		dice.setScale(0.1,0.1);

		const bettingText = this.add.text(300, 100, "", {});
		bettingText.text = "Put some coins";
		bettingText.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "35px", "stroke": "#000000", "strokeThickness":1});


		
		const prepare = this.add.text(200, 180, "", {});
		prepare.text = "Prepare to Cashout";
		prepare.setStyle({ "align": "center", "color": "#FFF4B5", "fontFamily": "Pixellari", "fontSize": "35px", "stroke": "#000000", "strokeThickness":1});
		prepare.setVisible(false);

		this.anims.create({
			key: 'wait',  
			frames: this.anims.generateFrameNumbers('wait', { start: 0, end: 12 }),  // Frame range
			frameRate: 5,  // Frames per second
			repeat: -1      // Loop the animation indefinitely
		});

		const wait = this.add.sprite(400, 300, 'wait');
		wait.play('wait');
		wait.setVisible(false);


		this.limit=0;

		this.sliderHandle = sliderHandle;
    	this.sliderTrack = sliderTrack;
    	this.sliderValueText = sliderValueText;
        this.button = button;
		this.bettingText = bettingText;
		this.wait = wait;
        this.coins =  coins;
        this.tickets = tickets;
		this.next = next;
		this.limits = limits;
		this.curretBetText = curretBetText;
		this.prepare = prepare;
		this.dice = dice;

	}


	 updateSliderValue(dragX) {
		this.sliderValue = Phaser.Math.Clamp(((dragX - 150) / 500) * this.limit, 1, this.limit);
		//this.sliderValueText.setText(Math.round(this.sliderValue));
		this.buttonText.setText("Play " + new Intl.NumberFormat().format(Math.round(this.sliderValue)));
	}


    create ()
    {
        this.editorCreate();
        this.cameras.main.setBackgroundColor(0x00ff00);
        EventBus.emit('current-scene-ready', this, "Betting");
    }

	setActiveBet(isBetActive, isBettingPhase, globalTimeNow){
		if(isBettingPhase){
			if(isBetActive){
				this.button.disableInteractive();
                this.button.setVisible(false);
				this.sliderTrack.setVisible(false);
                this.sliderHandle.setVisible(false);
				this.sliderHandle.disableInteractive();
                this.sliderValueText.setVisible(false);
                this.buttonText.setVisible(false);
				this.limits.setVisible(false);
				this.wait.setVisible(true);
				this.prepare.setVisible(true);
				
			} else {
				this.button.setInteractive();
            	this.button.setVisible(true);
				this.sliderTrack.setVisible(true);
            	this.sliderHandle.setVisible(true);
				this.sliderHandle.setInteractive();
            	this.sliderValueText.setVisible(true);
				this.bettingText.setVisible(true);
				this.dice.setVisible(true);
				this.buttonText.setVisible(true);
				this.limits.setVisible(true);

				if (parseInt(this.tickets.text) == 0){
					this.button.setVisible(false);
					this.sliderTrack.setVisible(false);
					this.sliderValueText.setVisible(false);
					this.button.disableInteractive();
					this.sliderHandle.setVisible(false);
					this.buttonText.text = "No tickets to play";
					this.buttonText.setX(250);
					this.bettingText.setVisible(false);
					this.dice.setVisible(false);
					this.limits.setVisible(false);

				}
				if (parseInt(this.coins.text) == 0){
					this.button.setVisible(false);
					this.sliderTrack.setVisible(false);
					this.sliderValueText.setVisible(false);
					this.button.disableInteractive();
					this.sliderHandle.setVisible(false);
					this.buttonText.text = "No coins to play";
					this.buttonText.setX(250);
					this.bettingText.setVisible(false);
					this.dice.setVisible(false);
					this.limits.setVisible(false);
				}
            	
				this.wait.setVisible(false);
				this.prepare.setVisible(false);
				this.sliderHandle.x = 650; 
				this.sliderValueText.setX(635);
				this.updateSliderValue(670);
			}
        } else {
			this.button.disableInteractive();
			this.button.setVisible(false);
			this.sliderTrack.setVisible(false);
			this.sliderHandle.setVisible(false);
			this.sliderHandle.disableInteractive();
			this.sliderValueText.setVisible(false);
			this.buttonText.setVisible(false);
			this.limits.setVisible(false);
			this.wait.setVisible(true);
			this.prepare.setVisible(true);
			this.next.text = "";
        	this.scene.start('MainMenu');
        }
	}

	updateScore(_coins, _tickets, _limit, _currentBet, _profit, _multiplier){
			this.coins.text = "$" +  new Intl.NumberFormat().format(_coins);
			this.tickets.text = _tickets;
			if(_limit > 0){
				this.limit = _limit;
				this.limits.text = "(Max " + this.limit + ")";
			}
			this.currentBet = _currentBet;
			if (_coins > 0 && _coins < _limit){
				this.limit = _coins;
				this.limits.text = "(Max " + new Intl.NumberFormat().format(_coins)+ ")";
			}
			if (_currentBet > 0){
				this.bettingText.text =  "Staked " + _currentBet;
			} else {
				this.bettingText.text = "Put some coins";
			}
			if (_tickets == 0){
				this.button.setVisible(false);
				this.button.disableInteractive();
				this.buttonText.text = "No tickets to play";
				this.buttonText.setX(250);

			}
			if (_coins == 0){
				this.button.setVisible(false);
				this.button.disableInteractive();
				this.buttonText.text = "No coins to play";
				this.buttonText.setX(250);
			}
    }

    changeText(text){
		if (this.next){
			this.next.text = text;
		}
    }


    
    /* END-USER-CODE */
}

/* END OF COMPILED CODE */
import PropTypes from 'prop-types';
import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import StartGame from './main';
import { EventBus } from './EventBus';
import {  Box } from "@chakra-ui/react";

export const PhaserGame = forwardRef(function PhaserGame ({ 
    currentActiveScene, 
    callBackCashout,
    callBackClick
}, ref)
{
    const game = useRef();
    useLayoutEffect(() => {
        if (game.current === undefined){
            game.current = StartGame("game-container");
            if (ref !== null) {
                ref.current = { game: game.current, scene: null };
            }
        }
        return () => {
            if (game.current) {
                game.current.destroy(true);
                game.current = undefined;
            }
        }
    }, [ref]);

    useEffect(() => {
        EventBus.on('current-scene-ready', (currentScene, name) => {
            currentActiveScene(currentScene, name);
            ref.current.scene = currentScene;        
        });
        return () => {
            EventBus.removeListener('current-scene-ready');
        }
    }, [currentActiveScene, ref]);

    useEffect(() => {
        EventBus.on('cashaout-click', (currentScene) => {
            if (currentActiveScene instanceof Function) {
                callBackCashout();
            }
            ref.current.scene = currentScene;        
        });
        return () => {
            EventBus.removeListener('cashaout-click');
        }
    }, [currentActiveScene, ref]);

    useEffect(() => {
        EventBus.on('place-bet-click', (currentScene, value) => {
            if (currentActiveScene instanceof Function) {
                callBackClick(value);
            }
            ref.current.scene = currentScene;        
        });
        return () => {
            EventBus.removeListener('place-bet-click');
        }
    }, [currentActiveScene, ref]);

    return (
        <Box w="100%" id="game-container">
        </Box>
    );
});


// Props definitions
PhaserGame.propTypes = {
    currentActiveScene: PropTypes.func ,
    callBackCashout: PropTypes.func ,
    callBackClick: PropTypes.func
}
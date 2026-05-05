/**
 * Server-side plugin for Server Shutdown extension.
 * Provides an API to terminate the SillyTavern process.
 */

const VERSION = '1.0.0';

/**
 * Initialize plugin.
 * @param {import('express').Router} router Express router
 */
async function init(router) {
    console.log('[Server Shutdown] Plugin loaded.');

    // Status endpoint
    router.get('/status', (req, res) => {
        res.send({
            status: 'ok',
            version: VERSION
        });
    });

    // Shutdown endpoint

    router.get('/shutdown', (req, res) => {
        console.log('[Server Shutdown] Shutdown request received from client.');
        
        // Send response first so the client knows it worked
        res.send({
            status: 'ok',
            message: 'Server is shutting down...'
        });

        // Delay exit slightly to allow the response to be sent
        setTimeout(() => {
            console.log('[Server Shutdown] Exiting process...');
            process.exit(0);
        }, 500);
    });

    return Promise.resolve();
}

async function exit() {
    return Promise.resolve();
}

module.exports = {
    init,
    exit,
    info: {
        id: 'st-server-shutdown',
        name: 'Server Shutdown Helper',
        description: 'Enables remote shutdown of the SillyTavern server.',
    },
};

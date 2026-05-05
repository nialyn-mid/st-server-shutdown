const fs = require('fs');
const path = require('path');

/**
 * Server Shutdown: Plugin Installer
 * This script installs the server-side component of the extension.
 */

async function install() {
    console.log('--- Server Shutdown: Plugin Installer ---');

    const stRoot = findStRoot(process.cwd());
    if (!stRoot) {
        console.error('Error: Could not find SillyTavern root directory.');
        console.log('Please run this script from within your SillyTavern folder or the extension folder.');
        return;
    }

    console.log(`Detected SillyTavern root: ${stRoot}`);

    // 1. Enable server plugins in config.yaml
    try {
        const configPath = path.join(stRoot, 'config.yaml');
        if (fs.existsSync(configPath)) {
            let configText = fs.readFileSync(configPath, 'utf8');
            
            if (configText.includes('enableServerPlugins: false')) {
                console.log('Enabling server plugins in config.yaml...');
                configText = configText.replace(/enableServerPlugins:\s*false/g, 'enableServerPlugins: true');
                fs.writeFileSync(configPath, configText, 'utf8');
                console.log('Successfully enabled server plugins.');
            } else if (configText.includes('enableServerPlugins: true')) {
                console.log('Server plugins already enabled.');
            }
        }
    } catch (e) {
        console.error(`Error updating config.yaml: ${e.message}`);
    }

    // 2. Setup server plugin directory
    const pluginTargetDir = path.join(stRoot, 'plugins', 'st-server-shutdown');
    try {
        if (!fs.existsSync(pluginTargetDir)) {
            fs.mkdirSync(pluginTargetDir, { recursive: true });
        }

        // Copy index.cjs from the extension's plugin folder
        const sourceFile = path.join(__dirname, '..', 'plugin', 'index.cjs');
        if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, path.join(pluginTargetDir, 'index.cjs'));
            console.log(`Copied server plugin to ${pluginTargetDir}`);
        } else {
            console.error(`Error: Source plugin file not found at ${sourceFile}`);
        }
    } catch (e) {
        console.error(`Error setting up plugin directory: ${e.message}`);
    }

    console.log('\n--- Installation Complete! ---');
    console.log('Please RESTART your SillyTavern server to apply the changes.');
}

function findStRoot(startPath) {
    let current = startPath;
    // Walk up to find ST root
    while (current !== path.parse(current).root) {
        if (fs.existsSync(path.join(current, 'config.yaml')) && (fs.existsSync(path.join(current, 'server.js')) || fs.existsSync(path.join(current, 'package.json')))) {
            // Additional check for ST: check if 'public' directory exists
            if (fs.existsSync(path.join(current, 'public'))) {
                return current;
            }
        }
        current = path.dirname(current);
    }
    return null;
}

install();

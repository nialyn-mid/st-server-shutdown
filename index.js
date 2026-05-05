import { getContext, renderExtensionTemplateAsync } from '/scripts/extensions.js';
import { logger, setLogLevel, LOG_LEVELS } from './js/logger.js';


// Dynamically determine the module name/path for template loading
const getModuleName = () => {
    try {
        const url = import.meta.url;
        const match = url.match(/scripts\/extensions\/(.+)\/index\.js/);
        if (match) return match[1];
    } catch (e) {
        // Fallback
    }
    return 'st-server-shutdown';
};

const MODULE_NAME = getModuleName();

// State constants
const STATE = {
    READY: 'ready',
    MISSING: 'missing',
    UPDATE: 'update',
    OFFLINE: 'offline',
};

const REQUIRED_SERVER_VERSION = '1.0.0';

const defaultSettings = {
    logLevel: LOG_LEVELS.WARN,
};

let settings = { ...defaultSettings };
let currentState = STATE.MISSING;

let intentionalShutdown = false;
let installedServerVersion = '0.0.0';


/**
 * Detects the current environment and returns an appropriate installation command.
 */
function getInstallCommand() {
    const isWin = navigator.platform.includes('Win');
    const slash = isWin ? '\\' : '/';

    // MODULE_NAME might be 'st-server-shutdown' or 'third-party/st-server-shutdown'
    let fullModuleName = MODULE_NAME;
    if (isWin) {
        fullModuleName = fullModuleName.replace(/\//g, '\\');
    }

    const relPath = `public${slash}scripts${slash}extensions${slash}${fullModuleName}${slash}install${slash}install-plugin.cjs`;
    return `node ${relPath}`;
}

/**
 * Checks if the server-side plugin is installed and active.
 */
async function checkPluginStatus() {
    if (intentionalShutdown) {
        return STATE.OFFLINE;
    }

    try {
        const response = await fetch('/api/plugins/st-server-shutdown/status');
        if (response.ok) {
            const data = await response.json();
            installedServerVersion = data.version || '0.0.0';

            if (installedServerVersion < REQUIRED_SERVER_VERSION) {
                logger.info(`Server plugin out of date. Installed: ${installedServerVersion}, Required: ${REQUIRED_SERVER_VERSION}`);
                return STATE.UPDATE;
            }

            return STATE.READY;
        }
    } catch (e) {
        // Network error or missing plugin
        logger.debug('Failed to connect to shutdown plugin:', e.message);
    }

    return STATE.MISSING;
}

/**
 * Updates the Setup Center UI based on current state.
 */
async function updateSetupUI() {
    const status = await checkPluginStatus();
    currentState = status;

    const container = document.getElementById('st-server-shutdown-settings');
    if (!container) return;

    const states = ['ready', 'missing', 'update', 'offline'];
    states.forEach(s => {
        const el = document.getElementById(`st-server-shutdown-state-${s}`);
        if (el) el.classList.add('hidden');
    });

    const currentEl = document.getElementById(`st-server-shutdown-state-${status}`);
    if (currentEl) currentEl.classList.remove('hidden');

    // Show/hide main settings
    const mainSettings = document.getElementById('st-server-shutdown-main-settings');
    if (mainSettings) {
        if (status === STATE.READY) {
            mainSettings.classList.remove('hidden');
        } else {
            mainSettings.classList.add('hidden');
        }
    }

    // Update command text
    const cmdText = getInstallCommand();
    const cmdEls = document.querySelectorAll('.st-server-shutdown-command');
    cmdEls.forEach(el => {
        el.textContent = cmdText;
    });
}


/**
 * Handles the shutdown button click.
 */
async function handleShutdown() {
    const $btn = $('#st-server-shutdown-btn');

    const $status = $('#st-server-shutdown-status');
    const $controls = $('#st-server-shutdown-controls');

    $controls.addClass('hidden');
    $status.removeClass('hidden');
    $btn.prop('disabled', true);

    try {
        const response = await fetch('/api/plugins/st-server-shutdown/shutdown');
        
        if (response.ok) {
            intentionalShutdown = true;
            toastr.success('Shutdown command sent successfully.');
            logger.info('Shutdown command acknowledged by server.');
            updateSetupUI();
        } else {
            throw new Error('Server returned an error.');
        }
    } catch (e) {
        logger.error('Failed to send shutdown command:', e);
        toastr.error('Failed to send shutdown command. Is the plugin installed?');
        $controls.removeClass('hidden');
        $status.addClass('hidden');
        $btn.prop('disabled', false);
    }
}


/**
 * Saves the extension settings.
 */
function saveSettings() {
    const context = getContext();
    context.extensionSettings[MODULE_NAME] = settings;

    logger.debug('Saving settings for', MODULE_NAME, settings);

    if (typeof context.saveSettingsDebounced === 'function') {
        context.saveSettingsDebounced();
    } else if (typeof context.saveSettings === 'function') {
        context.saveSettings();
    }
}

/**
 * Initializes the settings UI.
 */
function initSettingsUI(html) {
    const $settings = $(html);
    
    // Bind "Copy" button
    $settings.on('click', '.st-server-shutdown-copy-btn', function () {
        const cmd = getInstallCommand();
        navigator.clipboard.writeText(cmd);
        toastr.success('Command copied to clipboard!');
    });

    // Bind "Log Level" dropdown
    const $logLevel = $settings.find('#st-server-shutdown-log-level');
    $logLevel.val(settings.logLevel).on('change', function () {
        settings.logLevel = parseInt($(this).val());
        setLogLevel(settings.logLevel);
        saveSettings();
        logger.info(`Log level set to: ${$(this).find('option:selected').text()}`);
    });

    $settings.find('#st-server-shutdown-btn').on('click', handleShutdown);

    $('#extensions_settings').append($settings);
}


async function init() {
    const context = getContext();

    const loadSettings = () => {
        const savedSettings = context.extensionSettings[MODULE_NAME];
        if (savedSettings) {
            settings = Object.assign(settings, savedSettings);
            setLogLevel(settings.logLevel);
            logger.debug('Loaded settings:', settings);
        }
    };

    // Load settings
    loadSettings();

    // Re-check status when the drawer is opened
    jQuery(document).on('click', '.inline-drawer-toggle', function () {
        if (jQuery(this).closest('#st-server-shutdown-settings').length) {
            updateSetupUI();
        }
    });

    // Load template
    try {
        const html = await renderExtensionTemplateAsync(MODULE_NAME, 'settings');
        initSettingsUI(html);
        updateSetupUI();
    } catch (e) {
        console.error('[Server Shutdown] Failed to load settings template:', e);
    }

    // Listen for global settings loaded event
    context.eventSource.on(context.eventTypes.SETTINGS_LOADED, () => {
        logger.debug('SETTINGS_LOADED event received, re-loading settings.');
        loadSettings();
        // Update UI if it exists
        $('#st-server-shutdown-log-level').val(settings.logLevel);
    });
}



init();

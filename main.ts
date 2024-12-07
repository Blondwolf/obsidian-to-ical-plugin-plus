import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { IcalService } from './icalService';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	iCalService: IcalService;

	async onload() {
		await this.loadSettings();

		this.iCalService = new IcalService();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'export-tasks-to-ical',
			name: 'Export Tasks to iCal',
			callback: async () => {
				console.log('Export Tasks to iCal');

				//1. Load tasks from "tasks-plugin"
				const tasks = this.app.plugins.plugins['obsidian-tasks-plugin'].getTasks();

				//2. Generate Calendar from tasks
				const icalData = this.iCalService.generateCalendar(tasks);
				console.log(icalData);

				//3. Save file
				//this.saveICalFile(icalData);

				//4. Externally
				// TODO with NodeRED  curl -X PUT "http://192.168.1.20:4080/caldav.php/Calendar/calendar/DEV.ics"     -u admin:admin     -H "Content-Type: text/calendar"     -H "If-None-Match: *"     --data-binary @Dev.ics
				// Attention .../calendar/XXXX.ics est unique. Possible d'utiliser PROPPATCH (update) ou plusieurs chemin. a voir
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting 3')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
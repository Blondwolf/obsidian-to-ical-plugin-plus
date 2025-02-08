import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, request, Setting } from 'obsidian';
import { IcalService } from './icalService';

// Remember to rename these classes and interfaces!

interface TaskToIcalPluginSettings {
	icalUser: string;
	icalPassword: string;
	icalURL: string;
}

const DEFAULT_SETTINGS: TaskToIcalPluginSettings = {
	icalUser: 'default',
	icalPassword: 'default',
	icalURL: 'default'
}

export default class MyPlugin extends Plugin {
	settings: TaskToIcalPluginSettings;
	iCalService: IcalService;

	async onload() 
	{
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

				//2. Get tasks from caldav server
				//const icsContent = await this.fetchICSFromAPI(this.settings.icalURL);	// This works but put on side
				//const tasksFromServer = this.iCalService.parseICSContent(icsContent);	// This works but put on side
				//console.log(tasksFromServer);

				//4. Generate Calendar from tasks
				const icalData = this.iCalService.generateCalendar(tasks);
				//const tasksLocal = this.iCalService.parseICSContent(icalData);		// This works but put on side
				console.log(icalData);

				//3. Check delta tasks
				// TODO. Check if task has source => means it come from obsidian and not the calendar
				// Probably useful to study the standard Ical better
				//var deltaTasks = this.compareTasks(tasksFromServer, tasksLocal); 		// This works but put on side
				//console.log(deltaTasks);

				//Temp => directly send ical
				this.uploadICSToAPI(this.settings.icalURL, icalData);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {

	}

	async fetchICSFromAPI(url: string): Promise<string> 
	{
		try 
		{
			const response = await request({
			  url,
			  method: "GET",
			  headers: {
				"Authorization": `Basic ${btoa(`${this.settings.icalUser}:${this.settings.icalPassword}`)}`,
				"Content-Type": "application/json",
				'Cache-Control': 'no-cache',
			  },
			});
			return response;
		} 
		catch (error) 
		{
			console.error("Error while uploading remote .ics :", error);
			throw error;
		}
	}

	async uploadICSToAPI(url: string, icsContent: string): Promise<void> 
	{
		try 
		{
			await request({
				url,
				method: "PUT",
				headers: {
					"Authorization": `Basic ${btoa(`${this.settings.icalUser}:${this.settings.icalPassword}`)}`,
					"Content-Type": "text/calendar",
					"Cache-Control": "no-cache",
				},
				body: icsContent,
			});
		} 
		catch (error) 
		{
			console.error("Error while uploading .ics content:", error);
			throw error;
		}
	}

	compareTasks(icsTasks: Task[], pluginTasks: Task[]): {
		newTasks: Task[];
		obsoleteTasks: Task[];
	  } {
		const newTasks: Task[] = [];
		const obsoleteTasks: Task[] = [];
	  
		// Utiliser une clé unique (par exemple, combinaison de title et startDate) pour identifier les tâches
		const pluginTaskMap = new Map<string, Task>(
		  pluginTasks.map((task) => [`${task.title}-${task.startDate?.toISOString()}`, task])
		);
	  
		// Trouver les nouvelles tâches (présentes dans .ics mais pas dans le plugin)
		for (const icsTask of icsTasks) {
		  const key = `${icsTask.title}-${icsTask.startDate?.toISOString()}`;
		  if (!pluginTaskMap.has(key)) {
			newTasks.push(icsTask);
		  }
		}
	  
		// Trouver les tâches obsolètes (présentes dans le plugin mais pas dans .ics)
		const icsTaskMap = new Map<string, Task>(
		  icsTasks.map((task) => [`${task.title}-${task.startDate?.toISOString()}`, task])
		);
	  
		for (const pluginTask of pluginTasks) {
		  const key = `${pluginTask.title}-${pluginTask.startDate?.toISOString()}`;
		  if (!icsTaskMap.has(key)) {
			obsoleteTasks.push(pluginTask);
		  }
		}
	  
		return { newTasks, obsoleteTasks };
	  }

	async loadSettings() 
	{
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() 
	{
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
			.setName('Calendar User')
			.setDesc('caldav server user')
			.addText(text => text
				.setPlaceholder('http://...')
				.setValue(this.plugin.settings.icalUser)
				.onChange(async (value) => {
					this.plugin.settings.icalUser = value;
					await this.plugin.saveSettings();
		}));

		new Setting(containerEl)
			.setName('Calendar Password')
			.setDesc('caldav server user password')
			.addText(text => text
				.setPlaceholder('Enter your username')
				.setValue(this.plugin.settings.icalPassword)
				.onChange(async (value) => {
					this.plugin.settings.icalPassword = value;
					await this.plugin.saveSettings();
		}));

		new Setting(containerEl)
			.setName('Calendar URL')
			.setDesc('URL of caldav server')
			.addText(text => text
				.setPlaceholder('Enter your password')
				.setValue(this.plugin.settings.icalURL)
				.onChange(async (value) => {
					this.plugin.settings.icalURL = value;
					await this.plugin.saveSettings();
		}));
	}
}
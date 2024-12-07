import { TFile, Vault } from 'obsidian';
//import { settings } from './SettingsManager';

export class FileClient {
  vault: Vault;

  constructor(vault: Vault) {
    this.vault = vault;
  }

  async save(calendar: string) {
    // const fileRelativePath = `${settings.savePath ?? settings.savePath + '/'}${settings.saveFileName}`;
    // const file = this.vault.getAbstractFileByPath(fileRelativePath);

    // if (file instanceof TFile) {
    //   // File exists to update the contents
    //   console.log('File exists: updating');
    //   await this.vault.modify(file, calendar);
    // } else {
    //   // File does not exist so create it
    //   console.log('File does not exist: creating');
    //   await this.vault.create(fileRelativePath, calendar);
    // }
  }
}

import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-language-select',
  templateUrl: './language-select.component.html',
  styleUrls: ['./language-select.component.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, CommonModule]
})
export class LanguageSelectComponent {
  @Input() availableLanguages: any[] = [];
  @Input() selectedLangCodes: string[] = [];

  searchTerm: string = '';

  constructor(private modalCtrl: ModalController) {}

  get filteredLanguages() {
    if (!this.searchTerm) {
      return this.availableLanguages;
    }
    return this.availableLanguages.filter(lang =>
      lang.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  isSelected(langCode: string) {
    return this.selectedLangCodes.includes(langCode);
  }

  toggleSelection(langCode: string) {
    if (this.isSelected(langCode)) {
      this.selectedLangCodes = this.selectedLangCodes.filter(code => code !== langCode);
    } else {
      this.selectedLangCodes.push(langCode);
    }
  }

  dismiss() {
    this.modalCtrl.dismiss(this.selectedLangCodes, 'confirm');
  }
}

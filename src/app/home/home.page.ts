import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LanguageSelectComponent } from '../language-select/language-select.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, HttpClientModule, LanguageSelectComponent],
})
export class HomePage {
  originalJson: any;
  pastedJsonString: string = '';
  translatedJson: any = null;
  translationErrors: any = {};
  isLoading = false;
  selectedLangCodes: string[] = [];
  inputType: 'json' | 'text' = 'json';
  inputText: string = '';
  translatedText: any = {};

  availableLanguages = [
    { name: 'Arabic', code: 'ar' },
    { name: 'Bengali', code: 'bn' },
    { name: 'Chinese (Simplified)', code: 'zh-CN' },
    { name: 'Chinese (Traditional)', code: 'zh-TW' },
    { name: 'English', code: 'en' },
    { name: 'French', code: 'fr' },
    { name: 'German', code: 'de' },
    { name: 'Hindi', code: 'hi' },
    { name: 'Indonesian', code: 'id' },
    { name: 'Italian', code: 'it' },
    { name: 'Japanese', code: 'ja' },
    
    { name: 'Korean', code: 'ko' },
    { name: 'Malayalam', code: 'ml' },
    { name: 'Marathi', code: 'mr' },
    { name: 'Portuguese', code: 'pt' },
    { name: 'Russian', code: 'ru' },
    { name: 'Spanish', code: 'es' },
    { name: 'Tamil', code: 'ta' },
    { name: 'Telugu', code: 'te' },
    { name: 'Turkish', code: 'tr' },
    { name: 'Urdu', code: 'ur' },
    { name: 'Vietnamese', code: 'vi' },
  ];

  constructor(private http: HttpClient, private modalCtrl: ModalController) {}

  async openLanguageSelect() {
    const modal = await this.modalCtrl.create({
      component: LanguageSelectComponent,
      componentProps: {
        availableLanguages: this.availableLanguages,
        selectedLangCodes: this.selectedLangCodes,
      },
    });
    modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      this.selectedLangCodes = data;
      if (this.selectedLangCodes.length > 0) {
        this.translate();
      }
    }
  }

  get selectedLanguages() {
    return this.availableLanguages.filter(lang => this.selectedLangCodes.includes(lang.code));
  }

  removeLanguage(lang: any) {
    this.selectedLangCodes = this.selectedLangCodes.filter(code => code !== lang.code);
  }

  objectKeys(obj: any) {
    return Object.keys(obj);
  }

  getLanguageName(langCode: string) {
    const lang = this.availableLanguages.find(l => l.code === langCode);
    return lang ? lang.name : '';
  }

  handleFileInput(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.processJsonString(e.target.result);
    };
    reader.readAsText(file);
  }

  processJsonString(jsonString: string) {
    if (!jsonString) {
      return;
    }
    try {
      this.originalJson = JSON.parse(jsonString);
      localStorage.setItem('originalJson', jsonString);
      this.pastedJsonString = ''; // Clear textarea after processing
    } catch (error) {
      console.error('Error parsing JSON:', error);
      // Optionally, show an error to the user
    }
  }

  translate() {
    this.translatedJson = null;
    this.translatedText = {};
    this.translationErrors = {};

    if (this.inputType === 'json') {
      if (this.pastedJsonString) {
        this.processJsonString(this.pastedJsonString);
      }

      if (!this.originalJson) {
        console.error("No JSON data to translate.");
        return;
      }
    } else {
      if (!this.inputText) {
        console.error("No text to translate.");
        return;
      }
    }

    if (this.selectedLanguages.length === 0) {
      console.error("No language selected.");
      return;
    }

    this.isLoading = true;
    if (this.inputType === 'json') {
      this.translatedJson = {};
    }

    const translationTasks$ = this.selectedLanguages.map(lang => {
      if (this.inputType === 'json') {
        const keys = Object.keys(this.originalJson);
        const values = Object.values(this.originalJson);

        const valueTranslationTasks$ = values.map((value: any) => {
          if (typeof value !== 'string' || value.trim() === '') {
            return of(value);
          }
          return this.http.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(value)}&langpair=en|${lang.code}`)
            .pipe(
              map((res: any) => {
                if (res.responseData.translatedText.includes('IS AN INVALID TARGET LANGUAGE')) {
                  throw new Error(res.responseData.translatedText);
                }
                return res.responseData.translatedText;
              }),
              catchError(error => {
                this.translationErrors[lang.code] = error.message;
                return of(value);
              })
            );
        });

        return forkJoin(valueTranslationTasks$).pipe(
          map(translatedValues => {
            const translatedObject: any = {};
            keys.forEach((key, index) => {
              translatedObject[key] = translatedValues[index];
            });
            this.translatedJson[lang.code] = translatedObject;
          })
        );
      } else {
        return this.http.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(this.inputText)}&langpair=en|${lang.code}`)
          .pipe(
            map((res: any) => {
              if (res.responseData.translatedText.includes('IS AN INVALID TARGET LANGUAGE')) {
                throw new Error(res.responseData.translatedText);
              }
              this.translatedText[lang.code] = res.responseData.translatedText;
            }),
            catchError(error => {
              this.translationErrors[lang.code] = error.message;
              return of(this.inputText);
            })
          );
      }
    });

    forkJoin(translationTasks$).subscribe({
      complete: () => {
        this.isLoading = false;
        console.log('All translations completed:', this.translatedJson || this.translatedText);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('An error occurred during the translation process:', error);
      }
    });
  }

  downloadContent(langCode: string) {
    if (this.inputType === 'json') {
      if (!this.translatedJson[langCode]) return;

      const jsonString = JSON.stringify(this.translatedJson[langCode], null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${langCode}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      if (!this.translatedText[langCode]) return;

      const blob = new Blob([this.translatedText[langCode]], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${langCode}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  }
}

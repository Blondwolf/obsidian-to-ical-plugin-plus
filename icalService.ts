export class IcalService { 
    parseICSContent(icsContent: string): Task[] {
      const tasks: Partial<Task>[] = [];

      // Divise le contenu en lignes
      const lines = icsContent.split(/\r?\n/);
    
      let currentTask: Partial<Task> = {};
      let inEvent = false;
    
      for (const line of lines) {
        if (line.startsWith('BEGIN:VEVENT')) 
        {
          inEvent = true;
          currentTask = {};
        } 

        else if (inEvent) {
          // Extraire les données d'un événement
          if (line.startsWith('SUMMARY:')) {
            currentTask.title = line.substring('SUMMARY:'.length).trim();
          } else if (line.startsWith('DTSTART')) {
            currentTask.scheduledDate = this.parseICSDate(line.substring('DTSTART:'.length).trim());
          } else if (line.startsWith('DTEND')) {
            currentTask.endDate = this.parseICSDate(line.substring('DTEND:'.length).trim());
          } else if (line.startsWith('DESCRIPTION:')) {
            currentTask.description = line.substring('DESCRIPTION:'.length).trim();
          } else if (line.startsWith('LOCATION:')) {
            currentTask.location = line.substring('LOCATION:'.length).trim();
          }

        else if (line.startsWith('END:VEVENT')) 
            {
              inEvent = false;

              if (currentTask.title && currentTask.scheduledDate) {
                tasks.push(currentTask);
              }
              currentTask = {};
            } 
        }
      }
    
      return tasks;
    }
    
    // Fonction utilitaire pour parser une date ICS
    parseICSDate(icsDate: string): Date 
    {
      // Remove GMT
      var timezone;
      if(icsDate.contains(":")){
        const result = icsDate.split(':');
        timezone = result[0];
        icsDate = result[1];
      }

      var dateMatch = icsDate.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/);
      if (!dateMatch) 
      {
        // Because android format is shitty, we have to do it twice
        icsDate = icsDate.replace(/\D/g, ''); 

        dateMatch = icsDate.match(/^(\d{4})(\d{2})(\d{2})(T(\d{2})(\d{2})(\d{2})Z?)?$/);
        if (!dateMatch) 
        {
          throw new Error(`Date ICS invalide : ${icsDate}`);
        }
      }
    
      const year = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10) - 1; // Mois commence à 0
      const day = parseInt(dateMatch[3], 10);
      const hour = parseInt(dateMatch[5] || '0', 10);
      const minute = parseInt(dateMatch[6] || '0', 10);
      const second = parseInt(dateMatch[7] || '0', 10);
    
      const localDate = new Date(Date.UTC(year, month, day, hour, minute, second));

      const offset = this.getTimezoneOffset(localDate, timezone);

      // Ajuster la date en soustrayant le décalage (UTC -> fuseau horaire)
      return new Date(localDate.getTime() - offset);
    }

    private getTimezoneOffset(date: Date, timezone?: string): number {
      try {
        // Si timezone est au format TZID=..., extraire uniquement le nom du fuseau horaire
        if (timezone?.startsWith('TZID=')) {
          timezone = timezone.split('=')[1]; // Récupère la partie après "TZID="
        }
    
        // Tenter de créer un formateur pour le fuseau horaire donné
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone || undefined, // Local par défaut si undefined
          timeZoneName: 'short',
        });
    
        // Obtenir la partie 'timeZoneName'
        const parts = formatter.formatToParts(date);
        const offsetPart = parts.find((part) => part.type === 'timeZoneName')?.value;
    
        if (!offsetPart) {
          throw new Error(`Impossible de déterminer le décalage UTC pour ${timezone || 'local'}`);
        }
    
        // Gérer les formats 'GMT+X' ou 'GMT-X'
        const matchGMT = offsetPart.match(/GMT([+-])(\d+)/);
        if (matchGMT) {
          const [, sign, hours] = matchGMT;
          const totalOffset = parseInt(hours) * 60;
          return (sign === '-' ? -1 : 1) * totalOffset * 60 * 1000;
        }
    
        // Gérer les formats '+HH:MM' ou '-HH:MM'
        const matchISO = offsetPart.match(/([+-]?)(\d{2}):(\d{2})/);
        if (matchISO) {
          const [, sign, hours, minutes] = matchISO;
          const totalOffset = parseInt(hours) * 60 + parseInt(minutes);
          return (sign === '-' ? -1 : 1) * totalOffset * 60 * 1000;
        }
    
        throw new Error(`Format de décalage UTC inattendu : ${offsetPart}`);
      } catch (error) {
        console.warn(`Erreur de fuseau horaire : ${error.message}. Utilisation du fuseau local.`);
        // Si une erreur survient, retourne le décalage pour le fuseau horaire local
        return date.getTimezoneOffset() * -60 * 1000; // Décalage natif en minutes, converti en ms
      }
    }

    generateCalendar(tasks: Task[], includeTodos: boolean = false): string {
      const events = this.generateEvents(tasks);
      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Optimized IcalService//EN',
        'X-WR-CALNAME:Obsidian Calendar',
        'CALSCALE:GREGORIAN',
        events,
        'END:VCALENDAR',
      ].join('\r\n')
      .split("\r\n")
      .filter(line => line.trim() !== "")
      .join("\r\n");
    }
  
    private generateEvents(tasks: Task[]): string {
      return tasks.map((task: Task) => {
        return this.generateEvent(task);
      })
      .join('\r\n');
    }

    private generateEvent(task: Task): string {
      if(task.scheduledDate == null)
        return "";

      // Get date depends on format (daily notes || task with date)
      // => Daily notes have "Invalid Date" so we need to recreate the Date object
      var beginDate = task.scheduledDate._d == "Invalid Date" ?
                 new Date(task.scheduledDate._i) :
                 task.scheduledDate._d;

      // End date is due date or the same date if not specified
      var endDate;
      if(task.dueDate == null)
        endDate = new Date(beginDate.getTime());
      else
        endDate = task.dueDate;

      // Creation date. Default if does not exists
      const creationDate = task.creationDate ?? new Date(Date.now()); //new Date();//beginDate;

      // Parse time from description and add it to the 'Date' object
      const time = this.parseTimeFromText(task.description);
      if(time.start != null){
        const startTimes = time.start.split(":");
        
        beginDate.setHours(startTimes[0]);
        beginDate.setMinutes(startTimes[1]);
        
        if(time.end != null){
          const endTimes = time.end?.split(":");

          endDate.setHours(endTimes[0]);
          endDate.setMinutes(endTimes[1]);
        }
      }

      // Remove time from description
      var summary = task.description
            .replace(new RegExp(`${time.start}|${time.end}|-`, "g"), "")
            .trim();

      // Determine ID. use generated ID
      const id = typeof task.id != 'undefined' && task.id ?
          task.id :
          summary + this.formatDateToICal(creationDate) + performance.now();

      // Generate ICal formatted event
      const event = [
        'BEGIN:VEVENT',
        `UID:${id}`,
        `SUMMARY:${summary}`,
        `DTSTAMP:${this.formatDateToICal(creationDate)}`,
        `DTSTART:${this.formatDateToICal(beginDate)}`,  //`DTSTART;TZID=Europe/Paris:${this.formatDateToICal(beginDate)}`,
        `DTEND:${this.formatDateToICal(endDate)}`,      //`DTEND;TZID=Europe/Paris:${this.formatDateToICal(endDate)}`,
        'DESCRIPTION:TODO',
        'LOCATION:ONLINE',
        'END:VEVENT',
      ];
  
      return event.filter(line => line).join('\r\n'); // Supprime les lignes vides
    }

    private parseTimeFromText(text: string): { start: string | null; end: string | null } {
      const timeRegex = /(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?/;
      const match = text.match(timeRegex);
  
      if (!match) {
        return { start: null, end: null };
      }
  
      return {
        start: match[1],// ? formatTime(match[1]) : null,
        end: match[2]// ? formatTime(match[2]) : null,
      };
    }
  
    private formatDateToICal(date: Date) {
      const pad = (num) => String(num).padStart(2, '0'); // Add 0 if necessary
      return (
          date.getUTCFullYear() +
          pad(date.getUTCMonth() + 1) + // Month begin with 0
          pad(date.getUTCDate()) +
          'T' +
          pad(date.getUTCHours()) +
          pad(date.getUTCMinutes()) +
          pad(date.getUTCSeconds()) +
          'Z'
      );
    }

    // Unused for the moment. TODO
    private formatLocation(location: string): string {
      if (!location) 
        return '';

      const encodedLocation = encodeURI(location);
      return `LOCATION:ALTREP="${encodedLocation}":${encodedLocation}`;
    }

    private generateTimeZone(){
      // BEGIN:VTIMEZONE
      // TZID:Europe/Paris
      // BEGIN:STANDARD
      // DTSTART:20231029T030000
      // RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
      // TZOFFSETFROM:+0200
      // TZOFFSETTO:+0100
      // TZNAME:CET
      // END:STANDARD
      // BEGIN:DAYLIGHT
      // DTSTART:20230326T020000
      // RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
      // TZOFFSETFROM:+0100
      // TZOFFSETTO:+0200
      // TZNAME:CEST
      // END:DAYLIGHT
      // END:VTIMEZONE
    }
  }
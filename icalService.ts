export class IcalService {
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
      const creationDate = task.creationDate ?? new Date();//beginDate;

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

      // Determine ID. use date + creation name if not defined
      const id = typeof task.id != 'undefined' && task.id ?
          task.id :
          summary + this.formatDateToICal(creationDate) + creationDate.getMilliseconds();

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
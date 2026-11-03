from docx import Document
from docx.shared import Inches, Pt, RGBColor
from pathlib import Path
from docx.oxml.ns import qn

doc = Document()
section = doc.sections[0]
section.top_margin = section.bottom_margin = Inches(.7)
section.left_margin = section.right_margin = Inches(.8)
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(11)
normal.paragraph_format.space_after = Pt(7)
for style in ['Title', 'Heading 1', 'Heading 2']:
    doc.styles[style].font.name = 'Calibri'
    doc.styles[style].font.color.rgb = RGBColor(0, 0, 0)
doc.add_heading('Seshat Notch user guide', 0)
for style in doc.styles:
    for border in list(style.element.iter(qn('w:pBdr'))):
        border.getparent().remove(border)
for border in list(doc.element.iter(qn('w:pBdr'))):
    border.getparent().remove(border)
doc.styles['Subtitle'].font.color.rgb = RGBColor(70,70,70)
doc.add_paragraph('Activities and analytics edition', 'Subtitle')
doc.add_paragraph('Use Seshat Notch to plan your day and keep a record of the small things you return to. Your activities, entries and plans are saved on this device. This guide explains the rebuilt activity screens and the planning tools that remain alongside them.')
doc.add_heading('Begin with one activity', 1)
for text in [
    'Open Today or Activities and choose New activity.',
    'Give it a name, such as Sleep cycle. Choose an Area or create one in the same form.',
    'Choose how to track it: a check, a count, a measurement, a time window, or something you want to avoid.',
    'Choose the schedule and start date. For Sleep cycle, choose a time window from 22:00 to 06:00. The end time belongs to the following day.',
    'Pick a symbol and color, add an optional note, and choose Create activity.'
]: doc.add_paragraph(text, 'List Number')
doc.add_heading('Choose a way to track progress', 2)
table = doc.add_table(rows=1, cols=2)
table.style = 'Light Shading Accent 1'
table.rows[0].cells[0].text = 'Activity type'
table.rows[0].cells[1].text = 'What to enter'
for a,b in [('Check it off','Mark a successful day with one check.'),('Count something','Enter an amount, such as four of eight glasses.'),('Measurement','Enter a value, such as 8,000 of 10,000 steps.'),('Time window','Check the day, then optionally add actual start and end times.'),('Stay away from something','Check days you stayed on track. Add details to record a slip. Automatic clean days is optional and off by default.')]:
    row=table.add_row().cells;row[0].text=a;row[1].text=b
doc.add_page_break()
doc.add_heading('Check in on Today', 1)
doc.add_paragraph('The seven rings show your week. Choose a day to see its activities. Use Still to do to find scheduled activities that are not complete. The arrow controls move between weeks, and Today brings you back.')
doc.add_paragraph('Choose the check beside an activity or select a box in its history. Count and measurement activities open an amount form. After a change, Undo stays available for five seconds. An unmarked past day stays empty; you do not need to record a missed day.')
doc.add_heading('Read the boxes', 2)
for text in ['A filled box with a check means Done.', 'A lighter box with a minus means Partial.', 'An outlined past box means Missed.', 'A hatched box means a rest day. A diagonal mark means an excused day or a break.', 'Today has a stronger outline. Future days and days before the start cannot be changed.']:
    doc.add_paragraph(text, 'List Bullet')
doc.add_heading('Use the keyboard', 2)
doc.add_paragraph('Tab into the grid, then use arrow keys to move between days. Space or Enter changes a box. Home and End move within a week; Page Up and Page Down move four weeks. Shift-click can mark a range. Add details opens notes and actual times without needing a right-click.')
doc.add_heading('Keep your plans nearby', 2)
doc.add_paragraph('Tasks, daily goals, focus sessions and a link to your weekly reflection remain below the activity list. Plan holds projects, goals and life areas. Settings holds appearance, reminders, imports, exports and the recovery bin.')
doc.add_page_break()
doc.add_heading('Explore Activities and Analytics', 1)
doc.add_paragraph('Activities groups your routines by Area. Search by name, open or collapse an Area, and choose Explore the full year for a larger history. Calendar view arranges the year into month blocks. Select an activity name for its details, notes and edit history.')
doc.add_heading('Make space for changes', 2)
doc.add_paragraph('Edit activity lets you change the schedule from a chosen date while preserving earlier schedules. Take a break excludes a date range from rates and streaks. Excuse a day excludes one day. Archive keeps an activity out of active lists. Delete moves it to the recovery bin; its saved entries remain available for recovery.')
doc.add_heading('Understand your numbers', 2)
for title,body in [
 ('Completion','Completed scheduled days divided by scheduled days in the selected period. Rest days, breaks and excused days are excluded. An unmarked today is excluded until completed.'),
 ('Streak','Consecutive successful scheduled days. An open today does not break a streak. Flexible weekly goals count met weeks.'),
 ('Activity score','A weighted completion rate over the latest 120 scheduled days. Recent days matter more; the weight halves every 14 days.'),
 ('Momentum','The last 30 days compared with the preceding 30 days, in percentage points. Each period needs at least 10 scheduled days.'),
 ('Attainment','How close you came to a count or measurement goal. Four of eight glasses is 50% attainment, while the strict completion rate remains 0% for that day.')
]:
    p=doc.add_paragraph();p.add_run(title+'. ').bold=True;p.add_run(body)
doc.add_paragraph('Use Overview for everything together, or By activity to select up to four activities. Filter by time range and Area. The question-mark controls explain formulas. View numbers opens a table behind each chart. Time-window consistency needs five entries with actual times.')
doc.add_page_break()
doc.add_heading('Keep your records safe', 1)
doc.add_paragraph('Save a JSON backup regularly from Today or Settings. The new format includes your activities, entries, preferences and planning records. Older version 1 and 2 backup files still import. Import creates a safety snapshot before changing data.')
doc.add_paragraph('Browser and desktop installations use separate local databases. Export a backup from one and import it into the other when moving devices or installations.')
doc.add_heading('PIN and privacy', 2)
doc.add_paragraph('App Lock hides the app behind a PIN. It does not encrypt your saved data or backup files. Five wrong PIN attempts cause a one-minute wait. All activity features work locally; no advertising, tracking or cloud account is added.')
doc.add_heading('Quick shortcuts', 2)
for text in ['Ctrl+K opens Quick Add. Type a normal task, “activity Read daily” to create an activity in Unsorted, or “tick Sleep cycle” to check an existing activity.', 'Alt+1 opens Today, Alt+2 Activities, Alt+3 Analytics, Alt+4 Plan, Alt+5 Settings, and Alt+6 Reviews.', 'Escape closes the top dialog. Keyboard focus returns to the control that opened it.']:
    doc.add_paragraph(text,'List Bullet')
doc.add_heading('About the example', 2)
doc.add_paragraph('The automated Sleep cycle example starts on 1 October 2026. With 29 successful days and four missed days through 2 November, completion is 87.9% and the current streak is eight days. Completing 3 November makes it 30 of 34 days, or 88.2%, with a nine-day streak. These are test records, not preloaded personal statistics.')
section.footer.paragraphs[0].text = 'Seshat Notch | Activities and analytics guide | November 2026'
for filename in ['docs/Seshat-Notch-User-Manual.docx','Seshat-Notch-User-Manual.docx']:
    doc.save(filename)
print('Updated both manual copies.')

// Just a simple text editor so a user can add notes to a slide.
// ==============================================================================

(function () {
  'use strict';

    // TODO: Merge this with the text editor in viewer-utils.
    // Gray out buttons when no text is selected.
    // Remove options to insert link if no text is selected.

  function HMTextEditor (parent) {
    parent.addClass("box");
    let topDiv = $('<div>')
        .appendTo(parent)
	.addClass("box-container");
    this.Header = $('<div>')
        .appendTo(topDiv)
        .addClass("row header");
    this.Body = $('<div>')
        .appendTo(topDiv)
        .addClass("row content");

    // Add a call back to have the text editor fill available verticle space.
    
    this.Parent = parent;
    // I do not want the text editable until the note is set.
    this.Editable = true;
    this.Edit = true;
    // The user can set this to save the note automatically.
    this.ChangeCallback = null;
    // It is easiest to have the text editor create the save button
    this.SaveCallback = null;

    var self = this;
    this.EditButtons = [];
    //this.AddEditButton(SA.ImagePathUrl + 'camera.png', 'link view',
    //                       function () { self.InsertCameraLink(); });
    this.AddEditButton(SA.ImagePathUrl + 'link.png', 'link URL',
                           function () { self.InsertUrlLink(); });
    this.AddEditButton(SA.ImagePathUrl + 'font_bold.png', 'bold',
                           function () { document.execCommand('bold', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'text_italic.png', 'italic',
                           function () { document.execCommand('italic', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'edit_underline.png', 'underline',
                           function () { document.execCommand('underline', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'list_bullets.png', 'unorded list',
                           function () { document.execCommand('InsertUnorderedList', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'list_numbers.png', 'ordered list',
                           function () { document.execCommand('InsertOrderedList', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'indent_increase.png', 'indent',
                           function () { document.execCommand('indent', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'indent_decrease.png', 'outdent',
                           function () { document.execCommand('outdent', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'alignment_left.png', 'align left',
                           function () { document.execCommand('justifyLeft', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'alignment_center.png', 'align center',
                           function () { document.execCommand('justifyCenter', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'edit_superscript.png', 'superscript',
                           function () { document.execCommand('superscript', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'edit_subscript.png', 'subscript',
                           function () { document.execCommand('subscript', false, null); });
    this.AddEditButton(SA.ImagePathUrl + 'font_increase.png', 'large font',
                           function () {
                             document.execCommand('fontSize', false, '5');
                             self.ChangeBulletSize('1.5em');
                           });
    this.AddEditButton(SA.ImagePathUrl + 'font_decrease.png', 'small font',
                           function () {
                             document.execCommand('fontSize', false, '2');
                             self.ChangeBulletSize('0.9em');
                           });
    this.AddEditButton(SA.ImagePathUrl + 'save22.png', 'save',
                           function () { self.SaveNote(); });


    this.TextEntry = $('<div>')
            .appendTo(this.Body)
            .attr('contenteditable', 'true')
            .removeAttr('readonly')
            .css({'box-sizing': 'border-box',
              'width': '100%',
              'height': '100%',
              'overflow': 'auto',
              'resize': 'none',
              'border-style': 'inset',
              'font-size': '10pt',
              'font-family': 'Century Gothic',
              'background': '#f5f8ff'})
            .bind('input', function () {
                // Leave events are not triggering.
              self.EventuallyUpdate();
            })
            .focusin(function () {
              SA.ContentEditableHasFocus = true;
            })
            .focusout(function () {
              SA.ContentEditableHasFocus = false;
              self.Update();
            })
        // Mouse leave events are not triggering.
            .mouseleave(function () { // back button does not cause loss of focus.
              self.Update();
            });

    this.UpdateTimer = null;
    // this.RecordViewTimer = null;

    // Do not enable editing until the Note is set.
    this.EditOff();
    this.Note = null;
  }

  HMTextEditor.prototype.StartWindowManagerTimer = function (linkNote, x, y) {
    // I think motion is a better trigger for the window manager.
    this.WindowManagerX = x;
    this.WindowManagerY = y;
    // hint for mouse up (text editor handles the event).
    this.LinkWindowLocation = 0;
    // Start a timer.
    var self = this;
    this.WindowManagerTimer = setTimeout(function () {
      self.WindowManagerTimer = undefined;
      self.ShowWindowManager(linkNote, x, y);
    }, 1000);
  };

  HMTextEditor.prototype.ShowWindowManager = function (linkNote, x, y) {
    if (this.WindowMangerTimer) {
      clearTimeout(this.WindowManagerTimer);
      this.WindowManagerTimer = undefined;
    }
    if (!SA.windowManager) {
      SA.windowManager = new SA.WindowManager();
    }
    SA.windowManager.Show(x, y,
                              '/webgl-viewer?view=' + linkNote.Id,
                              linkNote.Title);
    // Hack to keep mouse up from loading the note.
    this.LinkWindowLocation = 1;
  };

  // Every time the "Text" is loaded, they hyper links have to be setup.
  // TODO: Do we need to turn off editable?
  HMTextEditor.prototype.FormatLink = function (linkNote) {
    var self = this;
    var link = document.getElementById(linkNote.Id);
    if (link) {
      $(link)
                .css({'color': '#29C',
                  'background': 'white'})
                .hover(function () { $(this).css('color', 'blue'); },
                       function () { $(this).css('color', '#29C'); })
                .attr('contenteditable', 'false');

      $(link).contextmenu(function () { return false; });
      $(link).mousedown(function (e) {
        if (e.button === 0) {
          self.StartWindowManagerTimer(linkNote, e.pageX, e.pageY);
          return false;
        }
        if (e.button === 2) {
          self.LinkMenuObject = {Link: $(link),
            Note: linkNote};
                    // Position and show the properties menu.
          var pos = $(this).position();
          self.DeleteLinkButton.show();
          self.LinkMenu
                        .css({'left': (25 + pos.left) + 'px',
                          'top': (pos.top) + 'px'})
                        .show();
          return false;
        }
        return true;
      });
      $(link).mousemove(function (e) {
        if (e.which === 1) {
          var dx = e.pageX - self.WindowManagerX;
          var dy = e.pageY - self.WindowManagerY;
          if (Math.abs(dx) + Math.abs(dy) > 5) {
            self.ShowWindowManager(linkNote, e.pageX, e.pageY);
          }
        }
      });

      $(link).mouseup(function (e) {
        if (e.button === 0) {
          if (self.WindowManagerTimer) {
            clearTimeout(self.WindowManagerTimer);
            self.WindowManagerTimer = undefined;
          }
          if (self.LinkWindowLocation === 0) {
            SA.SetNote(linkNote);
            return false;
          }
        }
        return true;
      });
    }
  };

  HMTextEditor.prototype.SaveLink = function (link, note) {
    note.Save();
  };

  HMTextEditor.prototype.DeleteLink = function (link, note) {
    // TODO: Keep the old text.
    var text = link.text();
    $(document.createTextNode(text)).insertAfter(link);
    link.remove();
    note.DeleteCallback();
    this.UpdateNote();
    this.Note.Save();
  };

  HMTextEditor.prototype.SetChangeCallback = function (callback) {
    this.ChangeCallback = callback;
  };

  HMTextEditor.prototype.SetSaveCallback = function (callback) {
    this.SaveCallback = callback;
  };

  HMTextEditor.prototype.EventuallyUpdate = function () {
    if (this.UpdateTimer) {
      clearTimeout(this.UpdateTimer);
      this.UpdateTimer = null;
    }
    var self = this;
    this.UpdateTimer = setTimeout(function () { self.UpdateNote(); }, 5000);
  };

  HMTextEditor.prototype.Update = function () {
    if (this.UpdateTimer) {
      clearTimeout(this.UpdateTimer);
      this.UpdateTimer = null;
    } else {
      // I am using the timer as a modified flag.
      // Call update note to force an update.
      return;
    }
    this.UpdateNote();
  };

  HMTextEditor.prototype.EditOff = function () {
    if (!this.Edit) { return; }
    this.Edit = false;

    for (var i = 0; i < this.EditButtons.length; ++i) {
      this.EditButtons[i].hide();
    }

    this.TextEntry
            .attr('contenteditable', 'false')
            .attr('spellcheck', 'false')
            .css({'border-style': 'outset',
              'background': '#ffffff'})
            .unbind('input')
            .unbind('focusin')
            .unbind('focusout')
            .unbind('mouseleave')
            .blur();
  };

  HMTextEditor.prototype.EditableOff = function () {
    this.EditOff();
    this.Editable = false;
  };

  HMTextEditor.prototype.EditOn = function () {
    var self = this;
    if (!this.Editable) { return; }
    if (this.Edit) { return; }
    this.Edit = true;

    for (var i = 0; i < this.EditButtons.length; ++i) {
      this.EditButtons[i].show();
    }

    this.TextEntry
            .attr('contenteditable', 'true')
            .removeAttr('readonly')
            .css({'border-style': 'inset',
              'background': '#f5f8ff'})
            .bind('input', function () {
              self.Modified = true;
              self.EventuallyUpdate();
            })
            .focusin(function () {
              SA.ContentEditableHasFocus = true;
            })
            .focusout(function () {
              SA.ContentEditableHasFocus = false;
              self.Update();
            })
            .mouseleave(function () { // back button does not cause loss of focus.
              self.Update();
            });
  };

  HMTextEditor.prototype.AddEditButton = function (src, tooltip, callback) {
    var button = $('<img>');
    if (tooltip) {
      // button = $('<img title="'+tooltip+'">')
      button.prop('title', tooltip);
    }
    button
      .appendTo(this.Header)
      .addClass('editButton')
      .attr('src', src)
      .click(callback);
    this.EditButtons.push(button);
  };

  // execCommand fontSize does change bullet size.
  // This is a work around.
  HMTextEditor.prototype.ChangeBulletSize = function (sizeString) {
    // This call will clear the selected text if it is not in this editor.
    var range = SA.GetSelectionRange(this.TextEntry);
    range = range || SA.MakeSelectionRange(this.TextEntry);
    var listItems = $('li');
    for (var i = 0; i < listItems.length; ++i) {
      var item = listItems[i];
      if (range.isPointInRange(item, 0) ||
                range.isPointInRange(item, 1)) {
        $(item).css({'font-size': sizeString});
      }
    }
  };

  HMTextEditor.prototype.InsertUrlLink = function () {
    var self = this;
    var sel = window.getSelection();
        // This call will clear the selected text if it is not in this editor.
    var range = SA.GetSelectionRange(this.TextEntry);
    var selectedText = sel.toString();

    if (!this.UrlDialog) {
      var dialog = new SAM.Dialog(function () {
        self.InsertUrlLinkAccept();
      });
      dialog.Body.css({'margin': '1em 2em'});
      this.UrlDialog = dialog;
      dialog.Dialog.css({'width': '40em'});
      dialog.Title.text('Paste URL link');
      dialog.TextDiv =
                $('<div>')
                .appendTo(dialog.Body)
                .css({'display': 'table-row',
                  'width': '100%'});
      dialog.TextLabel =
                $('<div>')
                .appendTo(dialog.TextDiv)
                .text('Text to display:')
                .css({'display': 'table-cell',
                  'height': '2em',
                  'text-align': 'left'});
      dialog.TextInput =
                $('<input>')
                .appendTo(dialog.TextDiv)
                .val('#30ff00')
                .css({'display': 'table-cell',
                  'width': '25em'});

      dialog.UrlDiv =
                $('<div>')
                .appendTo(dialog.Body)
                .css({'display': 'table-row'});
      dialog.UrlLabel =
                $('<div>')
                .appendTo(dialog.UrlDiv)
                .text('URL link:')
                .css({'display': 'table-cell',
                  'text-align': 'left'});
      dialog.UrlInput =
                $('<input>')
                .appendTo(dialog.UrlDiv)
                .val('#30ff00')
                .css({'display': 'table-cell',
                  'width': '25em'})
                .bind('input', function () {
                  var url = self.UrlDialog.UrlInput.val();
                  if (self.UrlDialog.LastUrl === self.UrlDialog.TextInput.val()) {
                    // The text is same as the URL. Keep them synchronized.
                    self.UrlDialog.TextInput.val(url);
                  }
                  self.UrlDialog.LastUrl = url;
                  // Deactivate the apply button if the url is blank.
                  if (url === '') {
                    self.UrlDialog.ApplyButton.attr('disabled', true);
                  } else {
                    self.UrlDialog.ApplyButton.attr('disabled', false);
                  }
                });
    }

    // We have to save the range/selection because user interaction with
    // the dialog clears the text entry selection.
    this.UrlDialog.SelectionRange = range;
    this.UrlDialog.TextInput.val(selectedText);
    this.UrlDialog.UrlInput.val('');
    this.UrlDialog.LastUrl = '';
    this.UrlDialog.ApplyButton.attr('disabled', true);
    this.UrlDialog.Show(true);
  };

  HMTextEditor.prototype.InsertUrlLinkAccept = function () {
    var sel = window.getSelection();
    var range = this.UrlDialog.SelectionRange;
    range = range || SA.MakeSelectionRange(this.TextEntry);

    // Simply put a span tag around the text with the id of the view.
    // It will be formated by the note hyperlink code.
    var link = document.createElement('a');
    link.href = this.UrlDialog.UrlInput.val();
    link.target = '_blank';

    // Replace or insert the text.
    if (!range.collapsed) {
      // Remove the seelcted text.
      range.extractContents(); // deleteContents(); // cloneContents
      range.collapse(true);
    }
    var linkText = this.UrlDialog.TextInput.val();
    if (linkText === '') {
      linkText = this.UrlDialog.UrlInput.val();
    }
    link.appendChild(document.createTextNode(linkText));

    range.insertNode(link);
    if (range.noCursor) {
      // Leave the selection the same as we found it.
      // Ready for the next link.
      sel.removeAllRanges();
    }
    this.UpdateNote();
  };

  HMTextEditor.prototype.Resize = function (width, height) {
    var pos;
    pos = this.TextEntry.offset();
    this.TextEntry.height(height - pos.top - 5);
  };

    // No one seems to call this.
  HMTextEditor.prototype.SetHtml = function (html) {
    if (this.UpdateTimer) {
      clearTimeout(this.UpdateTimer);
      this.Update();
    }
    this.Note = null; // ??? Editing without a note
    this.EditOn();
    this.TextEntry.html(html);

    // Note needed here long term.
    // this looks for keywords in text and makes tags.
    SA.AddHtmlTags(this.TextEntry);
  };

  HMTextEditor.prototype.GetHtml = function () {
    return this.TextEntry.html();
  };

    // TODO: Editor should not become active until it has a note.
    // This probably belongs in a subclass.
    // Or in the note.
  HMTextEditor.prototype.LoadNote = function (note) {
    if (this.UpdateTimer) {
      clearTimeout(this.UpdateTimer);
      this.Update();
    }
    this.Note = note;

    this.TextEntry.html(note.Text);
        // Note needed here long term.
        // this looks for keywords in text and makes tags.
    SA.AddHtmlTags(this.TextEntry);

    this.UpdateMode(note.Mode);

    for (var i = 0; i < note.Children.length; ++i) {
      // In the future we can only call this on type "View"
      this.FormatLink(note.Children[i]);
    }

    this.MakeLinksClickable();
    if (SA.Edit) {
      this.EditOn();
    }
        // Bug fix: Next slide button was not showing text because it's
        // the editor's height was 0.
    this.TextEntry.trigger('resize');
  };

    // This gets called when the note's mode changes.
  HMTextEditor.prototype.UpdateMode = function (mode) {
    // TODO: change this to apply only to the textEntry window.
    if (mode === 'answer-show') {
      $('.sa-note').show();
      $('.sa-notes').show();
      $('.sa-diagnosis').show();
      $('.sa-differential-diagnosis').show();
      $('.sa-teaching-points').show();
      $('.sa-compare').show();
    } else if (mode === 'answer-hide' || mode === 'answer-interactive') {
      $('.sa-note').hide();
      $('.sa-notes').hide();
      $('.sa-diagnosis').hide();
      $('.sa-differential-diagnosis').hide();
      $('.sa-teaching-points').hide();
      $('.sa-compare').hide();
    }
  };

  // Copy the text entry text back into the note
  // (when the textEntry changes).
  // It saves the note too.
  HMTextEditor.prototype.UpdateNote = function () {
    this.UpdateTimer = null;
    if (!this.Note) {
      return;
    }
    this.Note.Text = this.TextEntry.html();
    if (this.ChangeCallback) {
      (this.ChangeCallback)();
    }

    this.MakeLinksClickable();
  };

  // Save button is created by the editor.
  HMTextEditor.prototype.SaveNote = function () {
    if (this.SaveCallback) {
      (this.SaveCallback)();
    }
  };

  // Link are not active in content editable divs.
  // Work around this.
  HMTextEditor.prototype.MakeLinksClickable = function () {
    if (SA.Edit) {
      // This is only necesary when div is editable.
      // Links work the same in both situations with this.
      var links = $('a');
      for (var i = 0; i < links.length; ++i) {
        var link = links[i];
        $(link)
            .click(function () {
                window.open(this.href, '_blank');
            });
      }
    }
  };

  SA.HMTextEditor = HMTextEditor;
})();

    // ==============================================================================

(function () {
  'use strict';

  function HMNotesWidget (parent, annotationViewer) {
    var self = this;
    SA.Edit = true;
    SA.notesWidget = this;  
    this.Modified = false;

    this.EditorDiv = $('<div>')
          .appendTo(parent)
          .css({'width': '100%',
		'height': '50%'});
    this.ScrollDiv = $('<div>')
          .appendTo(parent)
          .css({'width': '100%',
		'height': '50%'});      
    this.DisplayDiv = $('<div>')
          .appendTo(this.ScrollDiv);
      
    this.AnnotationViewer = annotationViewer;
    this.HMTextEditor = new SA.HMTextEditor(this.EditorDiv);

    this.HMTextEditor.SetChangeCallback(
                function () {
                  self.MarkAsModified();
                });
    this.HMTextEditor.SetSaveCallback(
                function () {
                  self.SaveNote();
                });
    this.HMTextEditor.EditOn();

    // Load any notes.
    this.ItemId = undefined;
    this.LoadSlideNotes(this.AnnotationViewer.NercId);  
  }

  HMNotesWidget.prototype.LoadSlideNotes = function (item_id) {
    var self = this;
    if (this.ItemId == item_id) {
      return;
    }
    this.DisplayDiv.empty(); 
    this.HMTextEditor.SetHtml("");
    // NERC HACK hack  hard coded url !!!!!!  
    let notes_url = "http://199.94.60.126/" + item_id + "/notes.json";
    $.ajax({
        cache: false,
        url: notes_url,
        dataType: 'application/json',
        complete: function (data) {
	    self.ItemId = item_id;
            let notes_info = JSON.parse(data.responseText);
	    self.LoadNoteInfo(notes_info);
        }
    });
  }
    
  HMNotesWidget.prototype.LoadNoteInfo = function (note_info) {
    let name = this.AnnotationViewer.GetDefaultLayerName();
    for (let username in note_info) {
      if (name == username) {
        this.HMTextEditor.SetHtml(note_info[username].note);
      } else {
        let labelDiv = $('<div>')
          .appendTo(this.DisplayDiv)
          .text(username);
        let noteDiv = $('<div>')
          .css({'border': '1px solid #AAA',
                'margin': '2px'})
          .appendTo(this.DisplayDiv)
          .html(note_info[username].note);
        }
     }
  }
 
  // TODO: THese methods do not belong in this class.
  // Trying to save user notes quietly.
  // Sort of hackish.
  HMNotesWidget.prototype.EventuallySaveUserNote = function () {
    if (this.SaveTimerId) {
      clearTimeout(this.SaveTimerId);
    }
    var self = this;
    this.SaveTimerId = setTimeout(function () {
      self.SaveNote();
    }, 2000);
  };
  HMNotesWidget.prototype.Flush = function () {
    if (this.SaveTimerId) {
      clearTimeout(this.SaveTimerId);
      this.SaveTimerId = false;
      this.SaveNote();
    }
  };
  // Hackish.
  HMNotesWidget.prototype.SaveNote = function () {
    if (this.SaveTimerId) {
      this.Flush();
      return;
    }
      
    let noteData = {
      image_id: this.AnnotationViewer.NercId,
      name: this.AnnotationViewer.GetDefaultLayerName(),
      note: this.HMTextEditor.GetHtml()
    };

    // NERC case: Save annotation with a cgi-bon script
    if (this.AnnotationViewer.NercId) {
      $.ajax({
        type: "POST",
        url: "http://199.94.60.126/cgi-bin/save-note.py",
        data: noteData,
        dataType: "application/json",
        encode: true,
        success: function(response){
          console.log("annotation saved: success");
        }
      }).done(function (data) {
	console.log("annotation saved: done");
      });
      this.MarkAsNotModified();
      return;
    } 
  };

  HMNotesWidget.prototype.MarkAsModified = function () {
    if (this.ModifiedCallback) {
      this.ModifiedCallback();
    }
    this.Modified = true;
  };

  HMNotesWidget.prototype.MarkAsNotModified = function () {
    if (this.ModifiedClearCallback) {
      this.ModifiedClearCallback();
    }
    this.Modified = false;
  };

  // TODO:
  // Hmmmm.  I do not think this is used yet.
  // SA.SaveButton setup should not be here though.
  HMNotesWidget.prototype.EditOn = function () {
    SA.SaveButton
            .prop('title', 'save to database')
            .attr('src', SA.ImagePathUrl + 'save22.png')
            .click(function () { self.SaveCallback(); });
    this.AddViewButton.show();
    this.HMTextEditor.EditOn();
  };

  HMNotesWidget.prototype.EditOff = function () {
    SA.SaveButton
            .prop('title', 'edit view')
            .attr('src', SA.ImagePathUrl + 'text_edit.png')
            .click(function () { self.EditOn(); });
    this.AddViewButton.hide();
    this.HMTextEditor.EditOff();
  };

  HMNotesWidget.prototype.SaveCallback = function (finishedCallback) {
    // Process containers for diagnosis ....
    SA.AddHtmlTags(this.HMTextEditor.TextEntry);
/*
    SA.display.RecordAnnotations();

    var note = this.GetCurrentNote();
    if (note) {
            // Lets try saving the camera for the current note.
            // This is a good comprise.  Do not record the camera
            // every time it moves, but do record it when the save button
            // is pressed.  This is ok, now that view links are visibly
            // selected. However, It is still not really obvious what will happen.
      note.RecordView(this.Display);
            // Record view does this too.
            // note.RecordAnnotations(this.Display);
    }

        // Root saves all the children with it.
        // There is always a root note.  Being over cautious.
        // May need to save text of the root note because it is displayed
        // even when view/camera links are the current note.
    if (this.RootNote) {
      note = this.RootNote;
    }
    note.NotesPanelOpen = (SA.resizePanel && SA.resizePanel.Visibility);
    var self = this;
    note.Save(function () {
      self.Modified = false;
      if (finishedCallback) {
        finishedCallback();
      }
    });
*/
  };

    // ------------------------------------------------------------------------------

  SA.HMNotesWidget = HMNotesWidget;
})();

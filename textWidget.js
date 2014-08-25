//==============================================================================
// The new behavior.
// The widget gets created with a dialog and is in it's waiting state.
// It monitors mouse movements and decides when to become active.
// It becomes active when the mouse is over the center or edge.
// I think we should have a method other than handleMouseMove check this
// because we need to handle overlapping widgets.
// When active, the user can move the circle, or change the radius.
// I do not know what to do about line thickness yet.
// When active, we will respond to right clicks which bring up a menu.
// One item in the menu will be delete.

// I am adding an optional glyph/shape/arrow that displays the text location.

//==============================================================================



var TEXT_WIDGET_WAITING = 0;
var TEXT_WIDGET_ACTIVE = 1;
var TEXT_WIDGET_DRAG = 2; // Drag text with position
var TEXT_WIDGET_DRAG_TEXT = 3; // Drag text but leave the position the same.
var TEXT_WIDGET_PROPERTIES_DIALOG = 4;

function TextWidget (viewer, string) {
  if (viewer == null) {
    return null;
  }

  this.Dialog = new Dialog(this);
  this.Dialog.Title.text('Text Annotation Editor');
  
  this.Dialog.TextInput =
    $('<textarea>')
      .appendTo(this.Dialog.Body)
      .css({'width': '100%'});
  
  this.Dialog.FontDiv =
    $('<div>')
      .appendTo(this.Dialog.Body)
      .css({'display':'table-row'});
  this.Dialog.FontLabel = 
    $('<div>')
      .appendTo(this.Dialog.FontDiv)
      .text("Font (px):")
      .css({'display':'table-cell',
            'text-align': 'left'});
  this.Dialog.FontInput =
    $('<input type="number">')
      .appendTo(this.Dialog.FontDiv)
      .val('12')
      .css({'display':'table-cell'});
  
  this.Dialog.ColorDiv =
    $('<div>')
      .appendTo(this.Dialog.Body)
      .css({'display':'table-row'});
  this.Dialog.ColorLabel =
    $('<div>')
      .appendTo(this.Dialog.ColorDiv)
      .text("Color:")
      .css({'display':'table-cell',
            'text-align': 'left'});
  this.Dialog.ColorInput =
    $('<input type="color">')
      .appendTo(this.Dialog.ColorDiv)
      .val('#30ff00')
      .css({'display':'table-cell'});
  
  /*
  this.Dialog.MarkerDiv =
    $('<div>')
      .appendTo(this.Dialog.Body)
      .css({'display':'table-row'});
  this.Dialog.MarkerLabel =
    $('<div>')
      .appendTo(this.Dialog.MarkerDiv)
      .text("Arrow:")
      .css({'display':'table-cell',
            'text-align': 'left'});
  this.Dialog.MarkerInput =
    $('<input type="checkbox">')
      .appendTo(this.Dialog.MarkerDiv)
      //.text("Marker")
      .attr('checked', 'true')
      .css({'display': 'table-cell'});
      */
  
  this.Dialog.MarkerDiv =
    $('<div>')
      .appendTo(this.Dialog.Body)
      .css({'display':'table-row'});
  this.Dialog.MarkerLabel =
    $('<div>')
      .appendTo(this.Dialog.MarkerDiv)
      .text("Visibility:")
      .css({'display':'table-cell',
            'text-align': 'left'});
  this.Dialog.MarkerInputButtons =
    $('<div>')
      .appendTo(this.Dialog.MarkerDiv)
      //.text("Marker")
      .attr('checked', 'false')
      .css({'display': 'table-cell'});
      
  this.Dialog.MarkerInput1 = 
    $('<input type="radio" name="visibilityoptions">Text only</input>')
      .appendTo(this.Dialog.MarkerInputButtons)
      .attr('checked', 'false')
      
  $('<br>').appendTo(this.Dialog.MarkerInputButtons);
  
  this.Dialog.MarkerInput2 = 
    $('<input type="radio" name="visibilityoptions">Arrow only, text on hover</input>')
      .appendTo(this.Dialog.MarkerInputButtons)
      .attr('checked', 'false')
      
  $('<br>').appendTo(this.Dialog.MarkerInputButtons);
  
  this.Dialog.MarkerInput3 = 
    $('<input type="radio" name="visibilityoptions">Arrow and text visible</input>')
      .appendTo(this.Dialog.MarkerInputButtons)
      .attr('checked', 'true')
  
  this.Dialog.BackgroundDiv =
    $('<div>')
      .appendTo(this.Dialog.Body)
      .css({'display':'table-row'});
  this.Dialog.BackgroundLabel =
    $('<div>')
      .appendTo(this.Dialog.BackgroundDiv)
      .text("Background:")
      .css({'display':'table-cell',
            'text-align': 'left'});
  this.Dialog.BackgroundInput =
    $('<input type="checkbox">')
      .appendTo(this.Dialog.BackgroundDiv)
      //.text("Background")
      .attr('checked', 'true')
      .css({'display': 'table-cell'});
  
  // Get default properties.
  this.Dialog.BackgroundInput.prop('checked', true);
  if (localStorage.TextWidgetDefaults) {
    var defaults = JSON.parse(localStorage.TextWidgetDefaults);
    if (defaults.Color) {
      this.Dialog.ColorInput.val(ConvertColorToHex(defaults.Color));
    }
    if (defaults.FontSize) {
      this.Dialog.FontInput.val(defaults.FontSize);
    }
    if (defaults.BackgroundFlag !== undefined) {
      this.Dialog.BackgroundInput.prop('checked', defaults.BackgroundFlag);
    }
    if (defaults.MarkerFlag !== undefined) {
      this.Dialog.MarkerInput.prop('checked', defaults.MarkerFlag);
    }
  }

  this.Popup = new WidgetPopup(this);
  this.Viewer = viewer;
  // Text widgets are created with the dialog open (to set the string).
  this.State = TEXT_WIDGET_PROPERTIES_DIALOG;
  this.CursorLocation = 0; // REMOVE

  var cam = this.Viewer.MainView.Camera;

  this.Text = new Text();
  this.Text.String = string;
  this.Text.UpdateBuffers(); // Needed to get the bounds.
  this.Text.Color = [0.0, 0.0, 1.0];
  this.Text.Anchor = [0.5*(this.Text.PixelBounds[0]+this.Text.PixelBounds[1]),
                      0.5*(this.Text.PixelBounds[2]+this.Text.PixelBounds[3])];


  // I would like to setup the ancoh in the middle of the screen,
  // And have the Anchor in the middle of the text.
  this.Text.Position = [cam.FocalPoint[0], cam.FocalPoint[1]];

  // The anchor shape could be put into the text widget, but I might want a thumb tack anchor.
  this.Arrow = new Arrow();
  this.Arrow.Origin = this.Text.Position; // note: both point to the same memory now.
  this.Arrow.Length = 50;
  this.Arrow.Width = 10;
  this.Arrow.UpdateBuffers();
  this.Arrow.Visibility = false;
  this.Arrow.Orientation = 45.0; // in degrees, counter clockwise, 0 is left
  this.Arrow.FillColor = [0,0,1];
  this.Arrow.OutlineColor = [1,1,0];
  this.Arrow.ZOffset = 0.2;
  this.Arrow.UpdateBuffers();

  viewer.WidgetList.push(this);
  this.ActiveReason = 1;

  // Sloppy defaults.
  var hexcolor = ConvertColorToHex(this.Dialog.ColorInput.val());
  this.Text.Size = parseFloat(this.Dialog.FontInput.val());
  this.Text.Color = hexcolor;
  this.Arrow.SetFillColor(hexcolor);
  this.Arrow.ChooseOutlineColor();
  this.Text.BackgroundFlag = this.Dialog.BackgroundInput.prop("checked");
  this.SetArrowVisibility(2);//this.Dialog.MarkerInput.prop("checked"));
  //TODO

  // It is odd the way the Anchor is set.  Leave the above for now.
  this.SetTextOffset(50,0);
}

// Three state visibility so text can be hidden during calss questions.
TextWidget.prototype.Draw = function(view, visibility) {
  if (visibility != ANNOTATION_OFF) {
    this.Arrow.Draw(view);
  }
  if (visibility == ANNOTATION_ON) {
    this.Text.Draw(view);
  }
}


TextWidget.prototype.RemoveFromViewer = function() {
  if (this.Viewer == null) {
    return;
  }
  var idx = this.Viewer.WidgetList.indexOf(this);
  if(idx!=-1) {
    this.Viewer.WidgetList.splice(idx, 1);
  }
}

TextWidget.prototype.Serialize = function() {
  if(this.Text === undefined){ return null; }
  var obj = new Object();
  obj.type = "text";
  obj.color = this.Text.Color;
  obj.size = this.Text.Size;
  obj.offset = [-this.Text.Anchor[0], -this.Text.Anchor[1]];
  obj.position = this.Text.Position;
  obj.string = this.Text.String;
  if(this.Dialog.MarkerInput1.checked){
    obj.visibility = 0;
  } else if(this.Dialog.MarkerInput2.checked){
    obj.visibility = 1;
  } else { // markerInput3.checked
    obj.visibility = 2;
  }
  //obj.visibility = this.Text.Visibility;
  obj.backgroundFlag = this.Text.BackgroundFlag;
  return obj;
}

// Load a widget from a json object (origin MongoDB).
TextWidget.prototype.Load = function(obj) {
  var string = obj.string;
  // Some empty strings got in my database.  I connot delete them from the gui.
  if (obj.string && obj.string == "") {
    this.RemoveFromViewer();
    return;
  }

  this.Text.String = obj.string;
  var rgb = [parseFloat(obj.color[0]),
             parseFloat(obj.color[1]),
             parseFloat(obj.color[2])];
  this.Text.Color = rgb;
  this.Text.Size = parseFloat(obj.size);
  if (obj.backgroundFlag != undefined) {
    this.Text.BackgroundFlag = obj.backgroundFlag;
  }
  this.Text.Position = [parseFloat(obj.position[0]),
                         parseFloat(obj.position[1]),
                         parseFloat(obj.position[2])];
  this.Arrow.Origin = this.Text.Position;

  // I added offest and I have to deal with entries that do not have it.
  if (obj.offset) { // how to try / catch in javascript?
    this.SetTextOffset(parseFloat(obj.offset[0]),
                       parseFloat(obj.offset[1]));
  }
  this.SetArrowVisibility(obj.visibility);
  this.Arrow.SetFillColor(rgb);
  this.Arrow.ChooseOutlineColor();

  this.Text.UpdateBuffers();
  this.UpdateArrow();
}

// When the arrow is visible, the text is offset from the position (tip of arrow).
TextWidget.prototype.SetTextOffset = function(x, y) {
  this.SavedTextAnchor = [-x, -y];
  this.Text.Anchor = this.SavedTextAnchor;
  this.UpdateArrow();
}


// When the arrow is visible, the text is offset from the position (tip of arrow).
TextWidget.prototype.SetPosition = function(x, y) {
  this.Text.Position = [x, y];
  this.Arrow.Origin = this.Text.Position;
}

// Anchor is in the middle of the bounds when the shape is not visible.
TextWidget.prototype.SetArrowVisibility = function(flag) {
  if (this.Arrow.Visibility == flag) {
    return;
  }
  if (flag == 2 || flag == 1) { // turn glyph on
    if (this.SavedTextAnchor == undefined) {
      this.SavedTextAnchor = [-30, 0];
      }
    this.Text.Anchor = this.SavedTextAnchor;
    this.Arrow.Visibility = true;
    this.Arrow.Origin = this.Text.Position;
    this.UpdateArrow();
  } else if(flag == 0) { // turn glyph off
    // save the old anchor incase glyph is turned back on.
    this.SavedTextAnchor = [this.Text.Anchor[0], this.Text.Anchor[1]];
    // Put the new (invisible rotation point (anchor) in the middle bottom of the bounds.
    this.Text.Anchor = [(this.Text.PixelBounds[0]+this.Text.PixelBounds[1])*0.5, this.Text.PixelBounds[2]];
    this.Arrow.Visibility = false;
  }
  eventuallyRender();
}

// Change orientation and length of arrow based on the anchor location.
TextWidget.prototype.UpdateArrow = function() {
  // Compute the middle of the text bounds.
  var xMid = 0.5 * (this.Text.PixelBounds[0] + this.Text.PixelBounds[1]);
  var yMid = 0.5 * (this.Text.PixelBounds[2] + this.Text.PixelBounds[3]);
  var xRad = 0.5 * (this.Text.PixelBounds[1] - this.Text.PixelBounds[0]);
  var yRad = 0.5 * (this.Text.PixelBounds[3] - this.Text.PixelBounds[2]);

  // Compute the angle of the arrow.
  var dx = this.Text.Anchor[0]-xMid;
  var dy = this.Text.Anchor[1]-yMid;
  this.Arrow.Orientation = -(180.0 + Math.atan2(dy, dx) * 180.0 / Math.PI);
  // Compute the length of the arrow.
  var length = Math.sqrt(dx*dx + dy*dy);
  // Find the intersection of the vector and the bounding box.
  var min = length;
  if (dy != 0) {
    var d = Math.abs(length * yRad / dy);
    if (min > d) { min = d; }
  }
  if (dx != 0) {
    var d = Math.abs(length * xRad / dx);
    if (min > d) { min = d; }
  }
  length = length - min - 5;
  if (length < 5) { length = 5;}
  this.Arrow.Length = length;
  this.Arrow.UpdateBuffers();
}

TextWidget.prototype.HandleKeyPress = function(keyCode, shift) {
  return false;
}

TextWidget.prototype.HandleDoubleClick = function(event) {
}

TextWidget.prototype.HandleMouseDown = function(event) {
  if (event.SystemEvent.which == 1) {
    if (this.State == TEXT_WIDGET_ACTIVE) {
      if (this.Arrow.Visibility && this.ActiveReason == 0) {
        this.State = TEXT_WIDGET_DRAG_TEXT;
      } else {
        this.State = TEXT_WIDGET_DRAG;
      }
      eventuallyRender();
    }
  }
}

// returns false when it is finished doing its work.
TextWidget.prototype.HandleMouseUp = function(event) {
  if (event.SystemEvent.which == 1) {
    if (this.State == TEXT_WIDGET_DRAG ||
        this.State == TEXT_WIDGET_DRAG_TEXT) {
      RecordState();
    }
    this.State = TEXT_WIDGET_ACTIVE;
  }

  if (this.State == TEXT_WIDGET_ACTIVE && event.SystemEvent.which == 3) {
    // Right mouse was pressed.
    // Pop up the properties dialog.
    // Which one should we popup?
    // Add a ShowProperties method to the widget. (With the magic of javascript).
    this.State = TEXT_WIDGET_PROPERTIES_DIALOG;
    this.ShowPropertiesDialog();
    }
}


// I need to convert mouse screen point to coordinates of text buffer
// to see if the mouse position is in the bounds of the text.
// Screen y vector point down (up is negative).
// Text coordinate system will match canvas text: origin upper left, Y point down.
TextWidget.prototype.ScreenPixelToTextPixelPoint = function(x,y) {
  var textOriginScreenPixelPosition = this.Viewer.ConvertPointWorldToViewer(this.Text.Position[0],this.Text.Position[1]);
  x = (x - textOriginScreenPixelPosition[0]) + this.Text.Anchor[0];
  y = (y - textOriginScreenPixelPosition[1]) + this.Text.Anchor[1];

  return [x,y];
}

TextWidget.prototype.HandleMouseMove = function(event) {
  if (this.State == TEXT_WIDGET_DRAG) {
    w0 = this.Viewer.ConvertPointViewerToWorld(event.LastMouseX, event.LastMouseY);
    w1 = this.Viewer.ConvertPointViewerToWorld(    event.MouseX,     event.MouseY);
    // This is the translation.
    var dx = w1[0] - w0[0];
    var dy = w1[1] - w0[1];

    this.Text.Position[0] += dx;
    this.Text.Position[1] += dy;
    this.Arrow.Origin = this.Text.Position;
    this.PlacePopup();
    eventuallyRender();
    return true;
  }
  if (this.State == TEXT_WIDGET_DRAG_TEXT) { // Just the text not the anchor glyph
    this.Text.Anchor[0] -= event.MouseDeltaX;
    this.Text.Anchor[1] -= event.MouseDeltaY;
    this.UpdateArrow();
    this.PlacePopup();
    eventuallyRender();
    return true;
  }
  // We do not want to deactivate the widget while the properties dialog is showing.
  if (this.State != TEXT_WIDGET_PROPERTIES_DIALOG) {
    return this.CheckActive(event);
  }
  return true;
}





TextWidget.prototype.HandleTouchPan = function(event) {
  // We should probably have a handle touch start too.
  // Touch start calls CheckActive() ...
  if (this.State == TEXT_WIDGET_ACTIVE) {
    if (this.Arrow.Visibility && this.ActiveReason == 0) {
      this.State = TEXT_WIDGET_DRAG_TEXT;
    } else {
      this.State = TEXT_WIDGET_DRAG;
    }
  }
  event.MouseDeltaX = event.MouseX - event.LastMouseX;
  event.MouseDeltaY = event.MouseY - event.LastMouseY;
  this.HandleMouseMove(event);
}
TextWidget.prototype.HandleTouchPinch = function(event) {
}
TextWidget.prototype.HandleTouchEnd = function(event) {
  this.State = TEXT_WIDGET_ACTIVE;
  this.SetActive(false);
}






TextWidget.prototype.CheckActive = function(event) {
  var tMouse = this.ScreenPixelToTextPixelPoint(event.MouseX, event.MouseY);

  // First check anchor
  // thencheck to see if the point is no the bounds of the text.

  if (this.Arrow.Visibility && this.Arrow.PointInShape(tMouse[0]-this.Text.Anchor[0], tMouse[1]-this.Text.Anchor[1])) {
    this.ActiveReason = 1; // Hackish
    // Doulbe hack. // Does not get highlighted because widget already active.
    this.Arrow.Active = true; eventuallyRender();
    this.SetActive(true);
    return true;
  }
  if (tMouse[0] > this.Text.PixelBounds[0] && tMouse[0] < this.Text.PixelBounds[1] &&
      tMouse[1] > this.Text.PixelBounds[2] && tMouse[1] < this.Text.PixelBounds[3]) {
    this.ActiveReason = 0;
    this.SetActive(true);
    return true;
  }
  this.SetActive(false);
  return false;
}

TextWidget.prototype.GetActive = function() {
  if (this.State == TEXT_WIDGET_ACTIVE || this.State == TEXT_WIDGET_PROPERTIES_DIALOG) {
    return true;
  }
  return false;
}

TextWidget.prototype.Deactivate = function() {
  this.Popup.StartHideTimer();
  this.State = TEXT_WIDGET_WAITING;
  this.Text.Active = false;
  this.Arrow.Active = false;
  this.Viewer.DeactivateWidget(this);
  eventuallyRender();
}

TextWidget.prototype.SetActive = function(flag) {
  // Dialog state is tricky because the widget is still active.
  // SetActive is used to clear the dialog state.
  if (this.State == TEXT_WIDGET_PROPERTIES_DIALOG) {
    this.State == TEXT_WIDGET_ACTIVE;
  }

  if (flag == this.GetActive()) {
    return;
  }

  if (flag) {
    this.State = TEXT_WIDGET_ACTIVE;
    this.Text.Active = true;
    if (this.ActiveReason == 1) {
      this.Arrow.Active = true;
    }
    this.Viewer.ActivateWidget(this);
    this.PlacePopup();
    eventuallyRender();
  } else {
    this.Deactivate();
  }
}

//This also shows the popup if it is not visible already.
TextWidget.prototype.PlacePopup = function () {
  var x = this.Text.Position[0];
  var y = this.Text.Position[1];
  var pt = this.Viewer.ConvertPointWorldToViewer(x, y);

  pt[0] += (this.Text.PixelBounds[1] - this.Text.Anchor[0]);
  pt[1] -= (this.Text.Anchor[1] + 10);

  this.Popup.Show(pt[0],pt[1]);
}

// Can we bind the dialog apply callback to an objects method?
TextWidget.prototype.ShowPropertiesDialog = function () {
  this.Dialog.ColorInput.val(ConvertColorToHex(this.Text.Color));
  this.Dialog.FontInput.val(this.Text.Size.toFixed(0));
  this.Dialog.BackgroundInput.prop('checked', this.Text.BackgroundFlag);
  this.Dialog.TextInput.val(this.Text.String);
  //this.Dialog.MarkerInput.prop('checked', this.Arrow.Visibility);
  //TODO

  // hack to suppress viewer key events.
  DIALOG_OPEN = true;

  this.Dialog.Show();
}

// Used?
function TextPropertyDialogApplyCheck() {
  var string = document.getElementById("textwidgetcontent").value;
  if (string.length > 1 && string.slice(-2) == "\n\n") {
    TextPropertyDialogApply();
  }
}

TextWidget.prototype.DialogApplyCallback = function () {
  this.SetActive(false);
  this.ApplyLineBreaks();

  var string = this.Dialog.TextInput.val();
  // remove any trailing white space.
  string = string.trim();
  if (string == "") {
    alert("Empty String");
    return;
  }

  var hexcolor = ConvertColorToHex(this.Dialog.ColorInput.val());
  var fontSize = this.Dialog.FontInput.val();
  var visibility = 2;
  if(this.Dialog.MarkerInput1.checked){
    visibility = 0;
  } else if(this.Dialog.MarkerInput2.checked){
    visibility = 1;
  }
  var backgroundFlag = this.Dialog.BackgroundInput.prop("checked");

  this.Text.String = string;
  this.Text.Size = parseFloat(fontSize);
  this.Text.UpdateBuffers();
  this.Text.SetColor(hexcolor);
  this.Arrow.SetFillColor(hexcolor);
  this.Arrow.ChooseOutlineColor();
  //this.SetArrowVisibility(markerFlag);
  
  this.Text.BackgroundFlag = backgroundFlag;

  localStorage.TextWidgetDefaults = JSON.stringify({Color: hexcolor, FontSize: fontSize, Visibility: visibility, BackgroundFlag: backgroundFlag});

  RecordState();

  eventuallyRender();
}

//Function to apply line breaks to textarea text.
TextWidget.prototype.ApplyLineBreaks = function() {
    var oTextarea = this.Dialog.TextInput[0];

    /*
    if (oTextarea.wrap) {
        oTextarea.setAttribute("wrap", "off");
    } else {
        oTextarea.setAttribute("wrap", "off");
        var newArea = oTextarea.cloneNode(true);
        newArea.value = oTextarea.value;
        oTextarea.parentNode.replaceChild(newArea, oTextarea);
        oTextarea = newArea;
    }
    */

    oTextarea.setAttribute("wrap", "off");
    var strRawValue = oTextarea.value;
    oTextarea.value = "";
    var nEmptyWidth = oTextarea.scrollWidth;
    var nLastWrappingIndex = -1;
    for (var i = 0; i < strRawValue.length; i++) {
        var curChar = strRawValue.charAt(i);
        if (curChar == ' ' || curChar == '-' || curChar == '+')
            nLastWrappingIndex = i;
        oTextarea.value += curChar;
        if (oTextarea.scrollWidth > nEmptyWidth) {
            var buffer = "";
            if (nLastWrappingIndex >= 0) {
                for (var j = nLastWrappingIndex + 1; j < i; j++)
                    buffer += strRawValue.charAt(j);
                nLastWrappingIndex = -1;
            }
            buffer += curChar;
            oTextarea.value = oTextarea.value.substr(0, oTextarea.value.length - buffer.length);
            oTextarea.value += "\n" + buffer;
        }
    }
    oTextarea.setAttribute("wrap", "");
}





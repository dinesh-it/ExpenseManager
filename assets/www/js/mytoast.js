var toast = {
    success : function() { },
    error   : function(message) { alert("Oopsie! " + message); },
    show    :  function(msg,duration) {
                            cordova.exec( toast.success, toast.error,  'MyToast', 'showToastMsg', [ { "MSG": msg,"DURATION":duration } ] );
                  }
};

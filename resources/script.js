window.contextMenuCallTime = 0;
(function (window, document, undefined) {

  var factory = function ($, DataTable) {

    "use strict";


    $('.search-toggle').click(function () {
      $('#filesOptionsMenu').sidenav('close')
      if ($('.hiddensearch').css('display') == 'none')
        $('.hiddensearch').slideDown();
      else
        $('.hiddensearch').slideUp();
    });

    /* Set the defaults for DataTables initialisation */
    $.extend(true, DataTable.defaults, {
      dom: "<'hiddensearch'f'>" +
        "tr" +
        "<'table-footer'Blip'>",
      renderer: 'material'
    });
    /* Default class modification */
    $.extend(DataTable.ext.classes, {
      sWrapper: "dataTables_wrapper",
      sFilterInput: "form-control input-sm",
      sLengthSelect: "form-control input-sm"
    });

    jQuery.fn.dataTable.ext.type.order['file-size-pre'] = function (data) {
      if (data === null || data === '') {
        return 0;
      }

      var matches = data.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)/i);
      var multipliers = {
        b: 1,
        bytes: 1,
        kb: 1000,
        kib: 1024,
        mb: 1000000,
        mib: 1048576,
        gb: 1000000000,
        gib: 1073741824,
        tb: 1000000000000,
        tib: 1099511627776,
        pb: 1000000000000000,
        pib: 1125899906842624
      };

      if (matches) {
        var multiplier = multipliers[matches[2].toLowerCase()];
        return parseFloat(matches[1]) * multiplier;
      } else {
        return -1;
      };
    };

    /* Bootstrap paging button renderer */
    DataTable.ext.renderer.pageButton.material = function (settings, host, idx, buttons, page, pages) {
      var api = new DataTable.Api(settings);
      var classes = settings.oClasses;
      var lang = settings.oLanguage.oPaginate;
      var btnDisplay, btnClass, counter = 0;
      var selectTr = null;
      var attach = function (container, buttons) {
        var i, ien, node, button;
        var clickHandler = function (e) {
          e.preventDefault();
          if (selectTr != null) {
            selectTr.css("background-color", "");
            selectTr.find('*').css("color", "");
          }
          if (!$(e.currentTarget).hasClass('disabled')) {
            api.page(e.data.action).draw(false);
          }
        };

        for (i = 0, ien = buttons.length; i < ien; i++) {
          button = buttons[i];

          if ($.isArray(button)) {
            attach(container, button);
          } else {
            btnDisplay = '';
            btnClass = '';

            switch (button) {

              case 'first':
                btnDisplay = lang.sFirst;
                btnClass = button + (page > 0 ?
                  '' : ' disabled');
                break;

              case 'previous':
                btnDisplay = '<i class="material-icons">chevron_left</i>';
                btnClass = button + (page > 0 ?
                  '' : ' disabled');
                break;

              case 'next':
                btnDisplay = '<i class="material-icons">chevron_right</i>';
                btnClass = button + (page < pages - 1 ?
                  '' : ' disabled');
                break;

              case 'last':
                btnDisplay = lang.sLast;
                btnClass = button + (page < pages - 1 ?
                  '' : ' disabled');
                break;

            }
            $('tbody > tr').contextmenu(function () {
              window.contextMenuCallTime++;
              if (window.contextMenuCallTime == 3) {
                $(this).find("a").last().trigger("click");
                window.contextMenuCallTime = 0;
              }
              return false;
            })
            $('tbody > tr').dblclick(function () {
              if ($(this).find("a").attr("path") != undefined) {
                if ($(this).find("a").attr("fileType") == "file") {
                  window.onbeforeunload = null;
                }
                window.location.href = $(this).find("a").attr("path")
              }
            });
            $('tbody > tr').click(function () {
              if (selectTr != null) {
                selectTr.css("background-color", "");
                selectTr.find('*').css("color", "");
              }
              $(this).css("background-color", "#4169e1");
              $(this).find('*').css("color", "white");
              selectTr = $(this);
            });
            if (btnDisplay) {
              node = $('<li>', {
                'class': classes.sPageButton + ' ' + btnClass,
                'id': idx === 0 && typeof button === 'string' ?
                  settings.sTableId + '_' + button : null
              })
                .append($('<a>', {
                  'href': '#',
                  'aria-controls': settings.sTableId,
                  'data-dt-idx': counter,
                  'tabindex': settings.iTabIndex
                })
                  .html(btnDisplay)
                )
                .appendTo(container);

              settings.oApi._fnBindAction(
                node, {
                action: button
              }, clickHandler
              );

              counter++;
            }
          }
        }
      };

      // IE9 throws an 'unknown error' if document.activeElement is used
      // inside an iframe or frame.
      var activeEl;

      try {
        // Because this approach is destroying and recreating the paging
        // elements, focus is lost on the select button which is bad for
        // accessibility. So we want to restore focus once the draw has
        // completed
        activeEl = $(document.activeElement).data('dt-idx');
      } catch (e) { }

      attach(
        $(host).empty().html('<ul class="material-pagination"/>').children('ul'),
        buttons
      );

      if (activeEl) {
        $(host).find('[data-dt-idx=' + activeEl + ']').focus();
      }
    };

    /*
     * TableTools Bootstrap compatibility
     * Required TableTools 2.1+
     */
    if (DataTable.TableTools) {
      // Set the classes that TableTools uses to something suitable for Bootstrap
      $.extend(true, DataTable.TableTools.classes, {
        "container": "DTTT btn-group",
        "buttons": {
          "normal": "btn btn-default",
          "disabled": "disabled"
        },
        "collection": {
          "container": "DTTT_dropdown dropdown-menu",
          "buttons": {
            "normal": "",
            "disabled": "disabled"
          }
        },
        "print": {
          "info": "DTTT_print_info"
        },
        "select": {
          "row": "active"
        }
      });

      // Have the collection use a material compatible drop down
      $.extend(true, DataTable.TableTools.DEFAULTS.oTags, {
        "collection": {
          "container": "ul",
          "button": "li",
          "liner": "a"
        }
      });
    }

  }; // /factory

  // Define as an AMD module if possible
  if (typeof define === 'function' && define.amd) {
    define(['jquery', 'datatables'], factory);
  } else if (typeof exports === 'object') {
    // Node/CommonJS
    factory(require('jquery'), require('datatables'));
  } else if (jQuery) {
    // Otherwise simply initialise as normal, stopping multiple evaluation
    factory(jQuery, jQuery.fn.dataTable);
  }

})(window, document);


var folderName = decodeURI(window.location.pathname.replace(/^.*[\\\/]/, ''));
if (folderName == "") {
  folderName = "{{request.host}}";
}
$(document).ready(function () {
  $('#datatable').dataTable({
    order: [[1, 'asc']],
    "columnDefs": [
      {
        "targets": 0, "orderable": false, "createdCell": function (td, cellData, rowData, row, col) {
          $(td).css('padding-left', '17px')
        }
      },
      {
        "targets": 1, "createdCell": function (td, cellData, rowData, row, col) {
          $(td).css('padding', '5px')
        }
      },
      { "width": "220px", "targets": 2 },
      { "width": "140px", "targets": 3 },
      { type: 'file-size', "width": "180px", "targets": 4 }
    ],
    "pageLength": -1,
    "oLanguage": {
      "sEmptyTable": "&emsp;&emsp;{{gstr('noFilesInThisFolder')}}",
      "sZeroRecords": "&emsp;&emsp;{{gstr('noMatchingItems')}}",
      "sSearch": "",
      "sSearchPlaceholder": "{{gstr('search')}}",
      "sInfo": "_START_ - _END_ of  _TOTAL_",
      "sLengthMenu": '<span>{{gstr("rowsPerPage")}}</span><select class="browser-default" style="margin-left:10px;outline: 1px solid #c9f3ef;">' +
        '<option value="10">10</option>' +
        '<option value="20">20</option>' +
        '<option value="30">30</option>' +
        '<option value="40">40</option>' +
        '<option value="50">50</option>' +
        '<option value="-1">{{gstr("all")}}</option>' +
        '</select></div>'
    },
    bAutoWidth: false,

    buttons: [
      {
        text: '<span style="color:#4d4d4d; margin-right:15px">{{gstr("print")}}<span>',
        extend: 'print',
        className: '',
        title: '',
        //  autoPrint: false,
        customize: function (win) {
          $(win.document.body)
            .css('font-size', '10pt')
            .prepend(
              '<h4>' + folderName + '</h4>',
            );

          $(win.document.body).find('table')
            .addClass('compact')
            .css('font-size', 'inherit',);
        },
        exportOptions: {
          columns: [1, 2, 3, 4]
        }
      },
      {
        text: '<span style="color:#4d4d4d; margin-right:15px">{{gstr("exportToExcel")}}<span>',
        extend: 'excelHtml5',
        filename: folderName + '_' + "excel",
        exportOptions: {
          columns: [1, 2, 3, 4]
        }
      },
      {
        text: '<span style="color:#4d4d4d; margin-right:15px">{{gstr("exportToCsv")}}<span>',
        extend: 'csvHtml5',
        filename: folderName + '_' + "csv",
        charset: 'UTF-8',
        bom: true,
        exportOptions: {
          columns: [1, 2, 3, 4]
        }
      },
      {

        text: '<span style="color:#4d4d4d; margin-right:15px">{{gstr("copyToClipboard")}}<span>',
        extend: 'copyHtml5',
        exportOptions: {
          columns: [1, 2, 3, 4]
        }

      },
    ]
  });
  document.getElementsByTagName("th")[1].style.paddingLeft = "5px"
  loadFolder(decodeURI(window.location.pathname));

});
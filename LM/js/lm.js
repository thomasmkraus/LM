'use strict';

const version = "1.0.0";

const LM_RECENTS        = "LM_RECENTS";
const LM_FAVORITES      = "LM_FAVORITES";
const LM_GROUPS         = "LM_LAUNCH_GROUPS";
const LM_FAVORITE_SORT  = "LM_FAVORITE_SORT";
const LM_LICENSE_STATUS = "LM_LICENSE_STATUS";
const LM_GROUPS_SORT    = "LM_GROUPS_SORT";

const LM_RECENT_XY      = "LM_RECENT_XY";
const LM_FAVORITE_XY    = "LM_FAVORITE_XY";
const LM_GROUPS_XY      = "LM_GROUPS_XY";
const LM_EDIT_FAV_XY    = "LM_EDIT_FAV_XY";
const LM_CONSOLE_XY     = "LM_CONSOLE_XY";
const LM_MENU_XY        = "LM_MENU_XY";
const LM_PICKER_XY      = "LM_PICKER_XY";
const LM_NEW_LG_XY      = "LM_NEW_LG_XY";

const LM_SORT_ASC_NAME = 1;
const LM_SORT_DES_NAME = 2;
const LM_SORT_ASC_TIME = 3;
const LM_SORT_DES_TIME = 4;

let terminal_x = 100;
let terminal_y = 100;

let connections_sort_by = LM_SORT_ASC_NAME;
let groups_sort_by    = LM_SORT_ASC_NAME;

let launchpad_id;
let connections_id;
let manage_groups_id;
let connections_icon_id;
let manage_groups_icon_id;
let console_id;
let console_icon_id;
let new_connection_id;
let recents_id;
let picker_id;
let new_group_id;

const MAX_RECENT = 10;
const MAX_EARLIER = 20;
const MAX_ALL_RECENT = 100;

let main_menu = {
	direction : TMK_MENU_HORIZONTAL,
	type      : TMK_FLOATING_MENU,
	active    : TMK_MENU_PASSIVE,
	items     : [
					{ text : "<B>LM</B>",    menu : {
						items     : [
							{  text : "About",   onclick  : function () { menu_about (0) } , },
							{  text : "Credits", onclick  : credits, },
						],
					}, },
					{ text : "Connections",   menufunc : get_connection_menu, arg : true, },
					{ text : "Groups",        menufunc : get_group_menu,      arg : true, },
					{ text : "Favorites",     menufunc : get_favorites_menu,  arg : true, },
					{ text : "Recent",        menufunc : get_recent_menu,     arg : true, },
					{ text : "Console",       menu  : {
						items     : [
							{ state : "enabled",  id : 10, text : "Open console",  onclick : open_console, },
							{ state : "disabled", id : 20, text : "Clear console", onclick : clear_console, },
							{ state : "disabled", id : 30, text : "Close console", onclick : close_console, },
						],
					}, },
				],
	};

function launch_manager ()
{
	let pos;

	TMK_set_error_args          ({ class : "lm-error", y : 60, min_h : 80, min_w : 300, dragable : true, shadow : true, });
	TMK_set_question_args       ({ y : 60, min_h : 80, min_w : 300, dragable : true, shadow : true, });
	TMK_set_confirmation_args   ({ y : 60, min_h : 80, min_w : 300, dragable : true, shadow : true, });

	launchpad_id = TMK_launchpad_create ( { radius: 16, y : 1, x : 80, w : -80, axis : TMK_AXIS_BOTTOM });

	if (!get_license_status ())
		menu_about (1);

	if(!(connections_sort_by = get_from_storage (LM_FAVORITE_SORT)))
		connections_sort_by = LM_SORT_DES_TIME;

	if(!(groups_sort_by = get_from_storage (LM_GROUPS_SORT)))
		groups_sort_by = LM_SORT_ASC_NAME;

	pos = get_from_storage (LM_MENU_XY);

	TMK_menu ({
		header   : "Main Menu",
		menu     : main_menu,
		radius   : 3,
		x         : pos ? pos ["x"] : 0,
		y         : pos ? pos ["y"] : 0,
		dragable : true,
		shadow   : true,
		arg      : LM_MENU_XY,
		onmoved  : function (window_id, arg, pos) { save_in_storage (LM_MENU_XY, pos); }
	});
}

// static
function open_console ()
{
	let pos;

	pos = get_from_storage (LM_CONSOLE_XY);

	console_id = TMK_console_open ({
		x          : pos ? pos ["x"] : 0,
		y          : pos ? pos ["y"] : 0,
		w          : pos ? pos ["w"] : 600,
		h          : pos ? pos ["h"] : 240,
		axis       : pos ? "left" : "right",
		tstamp     : 1,
		style      : "win",
		onclose    : function () { TMK_console_menu (false) },
		onminimize : function () { },
		onmoved    : function (window_id, arg, pos) { save_in_storage (LM_CONSOLE_XY, pos); },
		onresized  : function (window_id, arg, pos) { save_in_storage (LM_CONSOLE_XY, pos); },
	});

	if (typeof console_id == "undefined")
		TMK_error ("Console already open");
	else
	{
		console_icon_id = TMK_launchpad_add_window (launchpad_id, console_id, "img/console.png", null);

		TMK_console_menu (true);
	}
}

// static
function clear_console ()
{
	TMK_console_clear (console_id);
}

// static
function close_console ()
{
	console.log ("Close console");

	TMK_console_close ();

	TMK_icon_win_close (console_id, console_icon_id);

	TMK_console_menu (false);
}

// static
function TMK_console_menu (on)
{
	if (on)
	{
		TMK_menu_item_enable (main_menu, 20);
		TMK_menu_item_enable (main_menu, 30);
	}
	else
	{
		TMK_menu_item_disable (main_menu, 20);
		TMK_menu_item_disable (main_menu, 30);
	}
}


// static
function new_connection (e, obj, id)
{
	let u;
	let pos;
	let val;
	let html;
	let color;
	let header;
	let connection;

	connection = null;

	if (id)
		connection = get_from_storage (id);

	html = "<div style='padding: 8px'>";
	html += "<table border=0 bordercolor=blue cellpadding=4 cellspacing=4>";

	val = connection ? connection ["name"] : "";
	html += "<tr><td align=right>Name</td><td><input id=name size=50 type=text value='" + val + "'></td></tr>";

	val = connection ? connection ["url"] : "";
	html += "<tr><td align=right>URL</td><td><input id=url size=50 type=text value='" + val + "'></td></tr>";

	if (connection)
	{
		val = parseInt (connection ["x"]);
		html += "<tr><td align=right width=70>Left</td><td>";

		html += "<table border=0 bordercolor=red cellpadding=0 cellspacing=0><tr>";
		html += "<td><input id=x style='width: 75px' value=" + val + " min=100 type=number size=4>&nbsp;pixels</td><td width=40>&nbsp;</td>";

		val = parseInt (connection ["y"]);
		html += "<td align=right width=70>Top&nbsp;</td><td><input id=y style='width: 75px' value=" + val + " min=100 type=number size=4>&nbsp;pixels</td>";
		html += "</tr></table>";
	}

	val = connection ? parseInt (connection ["w"]) : "720";
	html += "<tr><td align=right width=70>Width</td><td>";

	html += "<table border=0 bordercolor=red cellpadding=0 cellspacing=0><tr>";
	html += "<td><input id=w style='width: 75px' value=" + val + " min=100 type=number size=4>&nbsp;pixels</td><td width=40>&nbsp;</td>";

	val = connection ? parseInt (connection ["h"]) : "480";
	html += "<td align=right width=70>Height&nbsp;</td><td><input id=h style='width: 75px' value=" + val + " min=100 type=number size=4>&nbsp;pixels</td>";
	html += "</tr></table>";

	color = "#dadada";

	if (connection && connection ["color"])
		color = connection ["color"];

	html += "<tr><td align=right>Color</td><td>";
	html += "<div id=color onclick='pick_color (\"" + color + "\");' style='width: 50px; height: 50px; border: 1px solid black; background: " + TMK_make_gradient (color) + "'>";
	html += "<input type=hidden id=color_val value='" + color + "'>";
	html += "</div></td></tr>";

	val = connection ? (connection ["favorite"] ? "checked" : "") : "";
	html += "<tr><td></td><td><input id=save type=checkbox " + val + ">&nbsp;<label for=save>Save as a favorite</label></td></tr>";

	val = connection ? (connection ["pin"] ? "checked" : "") : "";
	//html += "<tr><td></td><td><input id=pin type=checkbox " + val + ">&nbsp;<label for=pin>Keep in launchpad</label></td></tr>";

	val = connection ? connection ["track"] : false;
	html += "<tr><td></td><td><input id=track type=checkbox " + (val ? "checked" : "") + ">&nbsp;<label for=track>Track changes in location and size</label></td></tr>";

	html += "</table>";
	html += "</div>";

	if (connection)
		TMK_console_log ("Editing \"" + connection ["name"] + "\"");

	pos = get_from_storage (LM_EDIT_FAV_XY);
	header = connection ? "Edit Connection" : "New Connection",

	new_connection_id = TMK_modal ({
		header       : header,
		html         : html,
		x            : pos ? pos ["x"] : u,
		y            : pos ? pos ["y"] : u,
		fit          : true,
		button_count : connection ? 2 : 3,
		button1_text : connection ? "Save" : "Save & Connect",
		button2_text : "Cancel",
		button3_text : "Connect only",
		arg          : connection,
		onbutton1    : function (arg, pos) { return connect_verify (arg, pos, true); },
		onbutton2    : function () { TMK_window_close (picker_id); },
		onbutton3    : connection ? function () { TMK_window_close (picker_id); } : function (arg, pos) { return connect_verify (arg, pos, false) },
		keyboard     : true,
		shadow       : true,
		dragable     : true,
		exclusive    : true,
		style        : "win",
		onfocus      : "name",
		onmoved      : function (window_id, arg, pos) { save_in_storage (LM_EDIT_FAV_XY, pos); },
		onclose      : function (window_id, arg, pos) { TMK_smooth_close (picker_id); picker_id = null },
	});

	//TMK_launchpad_add_window (launchpad_id, new_connection_id, null, header, color);
}

// static
function pick_color (color)
{
	let u;
	let pos;
	let window_id;
	let colorPicker;

	if (!picker_id)
	{
		pos = get_from_storage (LM_PICKER_XY);

		picker_id = TMK_window_open ({
			header   : "Color Picker",
			html     : "<div style='padding: 20px' id=picker></div>",
			x        : pos ? pos ["x"] : u,
			y        : pos ? pos ["y"] : u,
			fit      : true,
			w        : 350,
			h        : 400,
			shadow   : true,
			dragable : true,
			onclose  : function () { picker_id = null },
			onmoved  : function (window_id, arg, pos) { save_in_storage (LM_PICKER_XY, pos); }
		});

		colorPicker = new iro.ColorPicker ("#picker", { color : color });

		colorPicker.on ('color:change', change_color);
	}
}

// static
function change_color (color)
{
	let obj;

	if (obj = document.getElementById ("color"))
	{
		obj.style.background = TMK_make_gradient (color.hex8String);

		if (obj = document.getElementById ("color_val"))
			obj.value = color.hex8String;
	}
}

// static
function TMK_make_gradient (rgb1)
{
	let r1;
	let g1;
	let b1;
	let r2;
	let g2;
	let b2;
	let rgb2;
	let linear;

	rgb1 = rgb1.substring (0, 7);

	r1 = parseInt ("0x" + rgb1.substring (1, 3));
	g1 = parseInt ("0x" + rgb1.substring (3, 5));
	b1 = parseInt ("0x" + rgb1.substring (5, 7));

	if ((r2 = parseInt (r1 * 1.75)) > 255) r2 = 255;
	if ((g2 = parseInt (g1 * 1.75)) > 255) g2 = 255;
	if ((b2 = parseInt (b1 * 1.75)) > 255) b2 = 255;

	r2 = r2.toString (16);
	g2 = g2.toString (16);
	b2 = b2.toString (16);

	rgb2 = "#" + r2 + "" + g2 + "" + b2;

	linear = "linear-gradient(" + rgb1 +" , " + rgb2 + ")";

	return linear;
}

// static
function connect_verify (connection, pos, save)
{
	let x;
	let y;
	let w;
	let h;
	let id;
	let obj;
	let ret;
	let url;
	let name;
	let track;
	let color;
	let parent;
	let new_pin;
	let old_pin;
	let is_favorite;

	id   = null;
	ret  = true;
	name = null;

	is_favorite = false;

	old_pin = connection ? connection ["pin"] : false;

	parent = TMK_get_window_obj (new_connection_id).id;

	if (obj = document.getElementById ("url"))
	{
		url = trim (obj.value);

		if (url.length > 0)
		{
			if (valid_url (url))
			{
				if (obj = document.getElementById ("name"))
					name = trim (obj.value);

				if (connection)
				{
					x = parseInt (document.getElementById ("x").value);
					y = parseInt (document.getElementById ("y").value);
				}
				else
				{
					x = terminal_x;
					y = terminal_y;
				}

				w = parseInt (document.getElementById ("w").value);
				h = parseInt (document.getElementById ("h").value);

				if (obj = document.getElementById ("color_val"))
					color = obj.value;

				track = false;

				if (obj = document.getElementById ("track"))
					track = obj.checked ? true : false;

				if (obj = document.getElementById ("save"))
				{
					if (obj.checked)
						is_favorite = true;
				}

				if (obj = document.getElementById ("pin"))
					new_pin = obj.checked ? true : false;

				if (!save || name.length > 0)
					ret = false;
				else
					TMK_error ({ html : "Please enter a name to save connection as", center_on : parent });
			}
			else
				TMK_error ({ html : "Please enter a full URL to connect to<br> (e.g. https://<i>mydomain.com<i>)", center_on : parent });
		}
		else
			TMK_error ({ html : "Please enter a full URL to connect to<br> (e.g. https://<i>mydomain.com<i>)", center_on : parent });
	}

	if (!ret)
	{
		if (save)
		{
			id = save_to_connections (connection ? connection ["id"] : null, name, url, track, color, is_favorite, new_pin, x, y, w, h);

			if (connections_id)
				manage_connections ();
		}

		if (connection)
		{
			//open_connection_by_id (null, null, connection ["id"]);
		}
		else
		{
			connect (id, name, url, track, color, is_favorite, new_pin, terminal_x, terminal_y, w, h);

			terminal_x += 75;
			terminal_y += 75;
		}

		if (new_pin && !old_pin)
		{
			let launch_icon;

			launch_icon = {
				text      : name,
				bcolor    : color,
				tag       : name,
				open      : function () { return },
				arg       : id,
				onclick   : function (e, obj, id) { open_connection_by_id (null, null, id) },
				launchpad : launchpad_id,
				};

			TMK_icon (launch_icon);
		}

		TMK_window_close (picker_id);
	}

	return ret;
}

// static
function open_connection_by_id (e, obj, id)
{
	let record;

	if (record = get_from_storage (id))
		return connect (id, record ["name"], record ["url"], record ["track"], record ["color"], record ["favorite"], record ["pin"], record ["x"], record ["y"], record ["w"], record ["h"]);
}

// static
function connect (id, name, url, track, color, is_favorite, pin, x, y, w, h)
{
	let iframe_id;
	let html;
	let window_id;
	let linear;

	iframe_id = TMK_make_random_id ();

	html = '<iframe id=' + iframe_id + ' style="border: 0px" height=100% width=100% src="' + url + '"></iframe>';

	window_id = TMK_window_open ({
		header     : name ? name : "Terminal",
		html       : html,
		x          : x,
		y          : y,
		w          : w,
		h          : h,
		style      : "win",
		dragable   : true,
		shadow     : true,
		activity   : iframe_id,
		resize     : true,
		keyboard   : true,
		launchpad  : launchpad_id,
		box        : TMK_DIMS_WINDOW,
		arg        : id,
		onmoved    : (id && track) ? save_xy : null,
		onresized  : (id && track) ? save_xy : null,
	});

	TMK_launchpad_add_window (launchpad_id, window_id, null, name, TMK_make_gradient (color));

	save_to_recent (id, name, url, track, color, is_favorite, pin, x, y, w, h);

	return window_id;
}

// static
function save_xy (window_id, arg, pos)
{
	let record;

	if (record = get_from_storage (arg))
	{
		record ["x"] = pos ["x"];
		record ["y"] = pos ["y"];
		record ["w"] = pos ["w"];
		record ["h"] = pos ["h"];

		save_in_storage (arg, record);
	}
}

// static
function get_group_menu (menu_item, all)
{
	let i;
	let count;
	let group;
	let groups;
	let group_menu;

	group_menu = {
		direction : TMK_MENU_VERTICAL,
		type      : TMK_FLOATING_MENU,
		items     : [ ],
		};

	count = 0;

	if (groups = get_launch_groups ())
	{
		for (i = 0; i < groups.length; i++)
		{
			group_menu ["items"].push ({ text : groups [i]["name"],  onclick : launch_group,  arg : groups [i]["id"] });
			count++;
		}
	}

	if (all)
	{
		if (count != 0)
			group_menu ["items"].push ({ text : null, });

		group_menu ["items"].push ({ text : "Create new group ...",     onclick  : new_group, });
		group_menu ["items"].push ({ text : null, });
		group_menu ["items"].push ({ text : "View / manage groups ...", onclick  : manage_groups, arg : true });
	}

	return group_menu;
}

// static
function launch_group (e, obj, group_id)
{
	let key;
	let group;
	let members;

	if (group = get_from_storage  (group_id))
	{
		if (members = group ["members"])
		{
			for (key in members)
			{
				if (key == "console")
					open_console ();
				else if (key == "connections")
					manage_connections ();
				else if (key == "groups")
					manage_groups (true, null);
				else
				{
					if (!open_connection_by_id (null, null, members [key]))
					{
						delete group ["members"][key];

						save_in_storage (members ["id"], group);
					}
				}
			}
		}
	}
}

// static
function new_group (e, obj, group_id)
{
	let u;
	let id;
	let val;
	let pos;
	let html;
	let newid;
	let group;
	let is_edit;

	is_edit = false;

	if (group_id)
	{
		group = get_from_storage (group_id);
		is_edit = true;
	}
	else
	{
		group_id = TMK_make_random_id ();
		group = { name : "", id : group_id, members : { }, time : 0 };
	}

	newid = group_id + "-tmp";
	save_in_storage (group_id + "-tmp", group);

	html = "<div style='padding: 10px'>";
	html += "<table border=0 bordercolor=blue cellpadding=4 cellspacing=4>";

	val = group ? group ["name"] : "";

	html += "<tr><td align=right>Name</td><td><input id=name size=50 type=text value='" + val + "'></td></tr>";
	html += "<tr height=10><td colspan=2></td></tr>";
	html += "<tr><td colspan=2><b><font size=+1>Connections in Group</font></b></td></tr>";
	html += "<tr><td align=center colspan=2>";
	html += "<table border=0 bordercolor=blue cellpadding=0 cellspacing=0>";
	html += "<tr><td><b>Members</b></td><td></td><td><b>Connections</b></td></tr>";
	html += "<tr><td>";

	html += "<div id=members style='overflow: auto; border: 1px solid black; width: 250px; height: 300px; overflow: none'>";
	html += get_launch_members (newid, group);
	html += "</div>";

	html += "</td><td width=40>&nbsp;</td><td>";

	html += "<div id=favorites style='overflow: auto; border: 1px solid black; width: 250px; height: 300px; overflow: none'>";
	html += get_favorites_for_launch (newid, group);
	html += "</div>";

	html += "</td></tr>";
	html += "</table>";
	html += "</td></tr>";

	html += "</table>";
	html += "</div>";

	pos = get_from_storage (LM_NEW_LG_XY);

	new_group_id = TMK_modal ({
		header       : is_edit ? "Edit Group" : "New Group",
		html         : html,
		x            : pos ? pos ["x"] : u,
		y            : pos ? pos ["y"] : u,
		fit          : true,
		button_count : 2,
		button1_text : "Save",
		button2_text : "Cancel",
		arg          : group_id,
		onbutton1    : save_launch_group,
		onbutton2    : function () { if (newid) delete_from_storage (newid) },
		dragable     : true,
		shadow       : true,
		exclusive    : true,
		style        : "win",
		keyboard     : true,
		onfocus      : "name",
		onmoved      : function (window_id, arg, pos) { save_in_storage (LM_NEW_LG_XY, pos); }
	});
}

// static
function save_launch_group (group_id)
{
	let i;
	let obj;
	let ret;
	let date;
	let name;
	let group;
	let parent;
	let groups;

	parent = TMK_get_window_obj (new_group_id).id;

	ret = true;

	if (obj = document.getElementById ("name"))
	{
		name = trim (obj.value);

		if (name.length > 0)
		{
			if (group = get_from_storage (group_id + "-tmp"))
			{
				date = new Date ();

				group ["name"] = name;

				save_in_storage (group_id, group);

				delete_from_storage (group_id + "-tmp");

				ret = false;

				if (groups = get_launch_groups ())
				{
					if (groups.length > 0)
					{
						for (i = 0; i < groups.length; i++)
						{
							if (groups [i]["id"] == group_id)
								groups.splice (i--, 1);
						}
					}
					else
						groups = [ ];
				}
				else
					groups = [ ];

				groups.push ({ id : group_id, time : date.getTime (), });

				save_in_storage (LM_GROUPS, groups);

				if (manage_groups_id)
					manage_groups (true, null);
			}
		}
		else
			TMK_error ({ html : "Please enter a group name", center_on : parent, });
	}

	return ret;
}

// static
function get_launch_members (group_id, group)
{
	let key;
	let html;
	let text;
	let count;
	let connection;

	html  = "<table border=0 bordercolor=red width=100% cellspacing=0 cellpadding=0>";
	count = 0;

	for (key in group ["members"])
	{
		if (key == "console")
			text = "Console";
		else if (key == "connections")
			text = "Connections";
		else if (key == "groups")
			text = "Groups";
		else
		{
			text = null;

			if (connection = get_from_storage (key))
				text = connection_text (connection);
		}

		if (text)
		{
			html += "<tr " + zebra (count) + ">";

			html += "<td><div id=member-" + count + " name=" + key + " class=pad10>" + text + "</div></td>";
			html += "<td width=40 ><div onclick='remove_from_members (\"" + group_id + "\", \"" + key + "\")' style='padding-left: 10px; font-size: 1.5em;'>&rarr;</div></td>";
			html += "</tr>";

			count++;
		}
	}

	html += "</table>";

	return html;
}

// static
function get_favorites_for_launch (group_id, group)
{
	let i;
	let html;
	let text;
	let count;
	let connections;

	html = "<table border=0 bordercolor=red width=100% cellspacing=0 cellpadding=0>";

	count = 0;

	if (!group ["members"]["console"])
	{
		html += "<tr " + zebra (count) + ">";
		text = "Console";
		html += "<td width=40><div onclick='move_to_members (\"" + group_id + "\", \"" + "console" + "\")' style='padding-left: 10px; font-size: 1.5em;'>&larr;</div></td>";
		html += "<td><div id=console class=pad10>" + text + "</div></td>";
		html += "</tr>";
		count++;
	}

	if (!group ["members"]["connections"])
	{
		html += "<tr " + zebra (count) + ">";
		text = "Connections";
		html += "<td width=40><div onclick='move_to_members (\"" + group_id + "\", \"" + "connections" + "\")' style='padding-left: 10px; font-size: 1.5em;'>&larr;</div></td>";
		html += "<td><div id=favourites class=pad10>" + text + "</div></td>";
		html += "</tr>";
		count++;
	}

	if (!group ["members"]["groups"])
	{
		html += "<tr " + zebra (count) + ">";
		text = "Groups";
		html += "<td width=40><div onclick='move_to_members (\"" + group_id + "\", \"" + "groups" + "\")' style='padding-left: 10px; font-size: 1.5em;'>&larr;</div></td>";
		html += "<td><div id=favourites class=pad10>" + text + "</div></td>";
		html += "</tr>";
		count++;
	}

	if (connections = get_saved_connections ())
	{
		if (connections.length > 0)
		{
			sort_connections_by (connections);

			for (i = 0; i < connections.length; i++)
			{
				if (!group ["members"][connections [i]["id"]])
				{
					html += "<tr " + zebra (count) + ">";

					text = connection_text (connections [i]);

					html += "<td width=40><div onclick='move_to_members (\"" + group_id + "\", \"" + connections [i]["id"] + "\")' style='padding-left: 10px; font-size: 1.5em;'>&larr;</div></td>";
					html += "<td><div id=" + connections [i]["id"] + " class=pad10>" + text + "</div></td>";
					html += "</tr>";

					count++;
				}
			}
		}
	}

	html += "</table>";

	return html;
}

// static
function remove_from_members (group_id, fav_id)
{
	let group;

	TMK_console_log ("remove_from_members: group_id = " + group_id + " fav_id " + fav_id);

	if (group = get_from_storage (group_id))
	{
		delete group ["members"][fav_id];
		save_in_storage (group_id, group);

		update_members (group_id, group);
	}
}

// static
function move_to_members (group_id, fav_id)
{
	let group;

	TMK_console_log ("move_to_members: group_id = " + group_id + " fav_id " + fav_id);

	if (group = get_from_storage (group_id))
	{
		group ["members"][fav_id] = fav_id;
		save_in_storage (group_id, group);

		update_members (group_id, group);
	}
}

// static
function update_members (group_id, group)
{
	let obj;

	if (obj = document.getElementById ("favorites"))
		obj.innerHTML = get_favorites_for_launch (group_id, group);

	if (obj = document.getElementById ("members"))
		obj.innerHTML = get_launch_members (group_id, group);
}

// static
function manage_groups (arg, xxx)
{
	let i;
	let u;
	let id;
	let pos;
	let html;
	let text;
	let color;
	let groups;

	html = "<div class=pad5>";
	html += "<table border=0 bordercolor=red width=100% cellspacing=0 cellpadding=0>";

	html += "<tr><td colspan=5>";
	html += "<table border=0 bordercolor=blue width=100% cellspacing=0 cellpadding=0><tr>";
	html += "<td width=50%>";
	html += "<div onclick='new_group ()' style='margin: 5px; padding: 0px; width: 20px;'><span style='font-size: 2.0em;'>&nbsp;&CirclePlus;&nbsp;</span></div>";
	html += "</td>";
	html += "<td align=right width=50%>";
	html += "<div onclick='sort_groups_popup (event)' style='font-size: 1.4em;'>&nbsp;&uarr;&darr;&nbsp;</div>";
	html += "</td>";
	html += "</tr></table>";
	html += "</td></tr>";

	if (groups = get_launch_groups ())
	{
		if (!arg || groups.length > 0)
		{
			sort_groups_by (groups);

			for (i = 0; i < groups.length; i++)
			{
				text = groups [i]["name"];

				html += "<tr " + zebra (i) + ">";

				html += "<td><div class=pad10 ondblclick='launch_group (event, this, \"" + groups [i]["id"] + "\")'>" + text + "</div></td>";
				html += "<td width=24 align=middle><div class=pad10><img alt='edit'    onclick='edit_group   (\"" + groups [i]["id"] + "\")' width=16 height=16 src=img/edit.png></div></td>";
				html += "<td width=24 align=middle><div class=pad10><img alt='delete'  onclick='delete_group (\"" + groups [i]["id"] + "\")' width=16 height=16 src=img/delete.png></div></td>";
				html += "</tr>";
			}

			html += "</table>";
			html += "</div>";

			pos = get_from_storage (LM_GROUPS_XY);

			if (manage_groups_id)
				TMK_get_content_obj (manage_groups_id).innerHTML = html;
			else
			{
				manage_groups_id = TMK_window_open ({
					header   : "Groups",
					x        : pos ? pos ["x"] : u,
					y        : pos ? pos ["y"] : u,
					fit      : true,
					html     : html,
					max_h    : 500,
					min_h    : 100,
					min_w    : 400,
					style    : "win",
					dragable : true,
					shadow   : true,
					resize   : true,
					onclose  : function () { manage_groups_id = null },
					onmoved  : function (window_id, arg, pos) { save_in_storage (LM_GROUPS_XY, pos); }
				});

				manage_groups_icon_id = TMK_launchpad_add_window (launchpad_id, manage_groups_id, "img/groups.png", null);
			}
		}
		else
		{
			TMK_question ({
				w        : 400,
				html     : "You have no groups to manage<br>Would you like to create one now?",
				class    : "lm-error",
				yes_text : "Yes",
				no_text  : "No",
				onyes    : function () { new_group (null, null, null) },
				onno     : function () { manage_groups (false , null) },
			});
		}
	}
}

// static
function edit_group (id)
{
	new_group (null, null, id);
}

// static
function delete_group (id)
{
	let html;
	let parent;
	let group;

	if (group = get_from_storage (id))
	{
		html  = "<div>Are you sure you want to delete the group</div>";
		html += "<div><br></div>";
		html += "<div style='text-align: center;'><b>" + group ["name"] + "</b></div>";

		parent = TMK_get_window_obj (manage_groups_id).id;

		TMK_question ({
			html      : html,
			class     : "lm-error",
			arg       : id,
			onyes     : function (id) { do_delete_group (id); manage_groups (false, null); },
			center_on : parent,
		});
	}
}

// static
function do_delete_group (id)
{
	let i;
	let new_groups;
	let groups;

	new_groups = [];

	if (groups = get_launch_groups ())
	{
		for (i = 0; i < groups.length; i++)
		{
			if (groups [i]["id"] == id)
			{
				TMK_console_log ("Deleting \"" + groups [i]["name"] + "\" from groups");

				groups.splice (i--, 1);
			}
			else
				new_groups.push ({ id : groups [i]["id"], time : groups [i]["time"], });
		}

		save_in_storage (LM_GROUPS, new_groups);
		delete_from_storage (id);
	}
}

// static
function sort_groups_by (groups)
{
	switch (groups_sort_by)
	{
		case LM_SORT_ASC_NAME: groups.sort (cmp_asc_name); break;
		case LM_SORT_DES_NAME: groups.sort (cmp_des_name); break;
		//case LM_SORT_ASC_TIME: groups.sort (cmp_asc_time); break;
		//case LM_SORT_DES_TIME: groups.sort (cmp_des_time); break;
	}
}

// static
function sort_groups_popup (e)
{
	let id;
	let sort_groups_menu;

	sort_groups_menu = {
		direction : TMK_MENU_VERTICAL,
		type      : TMK_POPUP_MENU,
		items     : [
						{ id : LM_SORT_ASC_NAME, icon: "img/blank.png", text : "Ascending Name",         onclick : "set_groups_sort (LM_SORT_ASC_NAME)" },
						{ id : LM_SORT_DES_NAME, icon: "img/blank.png", text : "Descending Name",        onclick : "set_groups_sort (LM_SORT_DES_NAME)" },
					],
	};

	TMK_set_menu_item_icon (sort_groups_menu, groups_sort_by, "img/checkmark.png");

	id = TMK_menu ({
		header   : "Sort Groups By ...",
		menu     : sort_groups_menu,
		zebra    : true,
		x        : e.clientX + 30,
		y        : e.clientY - 30,
		fit      : true,
		max_h    : 500,
		style    : "win",
		dragable : true,
		shadow   : true,
	});

	TMK_window_fit (id);
}

// static
function set_groups_sort (sort_by)
{
	groups_sort_by = sort_by;

	manage_groups (false, null);

	save_in_storage (LM_GROUPS_SORT, sort_by);
}

// static
function get_connection_menu (menu_item, all)
{
	let i;
	let fav_count;
	let not_fav_count;
	let state;
	let records;
	let connection_menu;

	connection_menu = {
		direction : TMK_MENU_VERTICAL,
		type      : TMK_FLOATING_MENU,
		items     : [
						{ text : "Create new connection ...",       onclick  : new_connection,  arg : false },
						{ text : "Launch",                          menu     : {
							items : [
								{ id : 10, text : "Favorites", menufunc : get_favorites_menu, arg : false },
								{ id : 20, text : "Groups",    menufunc : get_group_menu,     arg : false, },
								{ id : 30, text : "Recent",    menufunc : get_recent_menu,    arg : false },
								{ id : 40, text : "Other",     menufunc : get_other_menu,     arg : false },
							]
						}},
					],
		};

	records = get_saved_connections ();

	not_fav_count = fav_count = 0;

	for (i = 0; i < records.length; i++)
	{
		if (records [i]["favorite"])
			fav_count++;
		else
			not_fav_count++;
	}

	if (fav_count > 0)
		TMK_menu_item_enable (connection_menu, 10);
	else
		TMK_menu_item_disable (connection_menu, 10);

	if (not_fav_count > 0)
		TMK_menu_item_enable (connection_menu, 40);
	else
		TMK_menu_item_disable (connection_menu, 40);

	records = get_launch_groups ();

	if (records && records.length > 0)
		TMK_menu_item_enable (connection_menu, 20);
	else
		TMK_menu_item_disable (connection_menu, 20);

	records = get_recent_connections ();

	if (records && records.length > 0)
		TMK_menu_item_enable (connection_menu, 30);
	else
		TMK_menu_item_disable (connection_menu, 30);

	connection_menu ["items"].push ({ text : "View / manage connections ...", arg : false, onclick : manage_connections });

	return connection_menu;
}

// static
function get_recent_menu (menu_item, all)
{
	let i;
	let j;
	let id;
	let arg;
	let icon;
	let show;
	let start;
	let count;
	let recents;
	let is_favorite;
	let recent_menu;

	recent_menu = {
		direction : TMK_MENU_VERTICAL,
		type      : TMK_FLOATING_MENU,
		items     : [
						{ id : 10, text : "<I>No recent connections</I>", },
						{ id : 20, text : null  },
						{ id : 30, text : "Earlier",                   menufunc : earlier_today_menu, },
						{ id : 40, text : null  },
						{ id : 50, text : "Show all",                  onclick  : show_recents, },
						{ id : 60, text : null  },
						{ id : 70, text : "Clear recent connections",  onclick  : clear_recent, },
					],
		};

	if (recents = get_recent_connections ())
	{
		let text;
		let after;

		if (!all)
		{
			TMK_menu_item_hide (recent_menu, 20);
			TMK_menu_item_hide (recent_menu, 50);
			TMK_menu_item_hide (recent_menu, 60);
			TMK_menu_item_hide (recent_menu, 70);
		}

		TMK_menu_item_hide (recent_menu, 30);
		TMK_menu_item_hide (recent_menu, 40);

		if (recents.length == 0)
		{
			TMK_menu_item_show (recent_menu, 10);
			TMK_menu_item_hide (recent_menu, 20);
			TMK_menu_item_hide (recent_menu, 40);
			TMK_menu_item_hide (recent_menu, 50);
			TMK_menu_item_hide (recent_menu, 60);
			TMK_menu_item_hide (recent_menu, 70);
		}
		else
		{
			recents.sort (cmp_des_time);

			TMK_menu_item_hide (recent_menu, 10);

			start = new Date ();
			start.setHours (0, 0, 0, 0);

			after = 10;
			count = 0;
			show = true;

			for (i = recents.length - 1; i >= 0; i--)
			{
				if (show)
				{
					id = 1000 + i;

					if (recents [i]["favorite"])
						icon = "img/favorite.png";
					else
						icon = "img/blank.png";

					arg = recents [i]["id"];

					text = make_recent_text (recents [i]);

					TMK_menu_item_add_after (recent_menu, after, { id : id, icon : icon, text : text, arg : arg, onclick : open_connection_by_id });

					if (++count >= MAX_RECENT)
					{
						if (count + 1 >= MAX_RECENT)
						{
							TMK_menu_item_show (recent_menu, 30);
							TMK_menu_item_show (recent_menu, 40);
						}

						show = false;
						break;
					}
				}
			}
		}
	}

	return recent_menu;
}

// static
function get_favorites_menu (menu_item, all)
{
	let i;
	let ret;
	let text;
	let count;
	let connections;
	let favorites_menu;

	favorites_menu = {
		direction : TMK_MENU_VERTICAL,
		type      : TMK_FLOATING_MENU,
		icon_axis : TMK_AXIS_RIGHT,
		items     : [
					],
		};

	count = 0;

	if (connections = get_saved_connections ())
	{
		if (connections.length > 0)
		{
			ret = favorites_menu;
			sort_connections_by (connections);

			for (i = 0; i < connections.length; i++)
			{
				if (connections [i]["favorite"])
				{
					if (++count <= MAX_ALL_RECENT)
					{
						text = connection_text (connections [i]);

						favorites_menu ["items"].push ({ text : text, arg : connections [i]["id"], onclick : open_connection_by_id });
					}
					else
						break;
				}
			}
		}
	}

	if (count <= 0)
		favorites_menu ["items"].push ({ state : "disabled", text : "<i>No favorites</i>", });

	return favorites_menu;
}

// static
function get_other_menu (menu_item, all)
{
	let i;
	let ret;
	let text;
	let count;
	let connections;
	let other_menu;

	other_menu = {
		direction : TMK_MENU_VERTICAL,
		type      : TMK_FLOATING_MENU,
		icon_axis : TMK_AXIS_RIGHT,
		items     : [
					],
		};

	count = 0;

	if (connections = get_saved_connections ())
	{
		if (connections.length > 0)
		{
			ret = other_menu;
			sort_connections_by (connections);

			for (i = 0; i < connections.length; i++)
			{
				if (!connections [i]["favorite"])
				{
					if (++count <= MAX_ALL_RECENT)
					{
						text = connection_text (connections [i]);

						other_menu ["items"].push ({ text : text, arg : connections [i]["id"], onclick : open_connection_by_id });
					}
					else
						break;
				}
			}
		}
	}

	if (count <= 0)
		other_menu ["items"].push ({ state : "disabled", text : "<i>No favorites</i>", });

	return other_menu;
}

// static
function manage_connections ()
{
	let i;
	let id;
	let obj;
	let pos;
	let html;
	let icon;
	let text;
	let count;
	let color;
	let connections;

	html = "<div class=pad5>";
	html += "<table border=0 bordercolor=red width=100% cellspacing=0 cellpadding=0>";

	html += "<tr><td colspan=5>";
	html += "<table border=0 bordercolor=blue width=100% cellspacing=0 cellpadding=0><tr>";
	html += "<td width=50%>";
	html += "<div onclick='new_connection ()' style='margin: 5px; padding: 0px; width: 20px;'><span style='font-size: 2.0em;'>&nbsp;&CirclePlus;&nbsp;</span></div>";
	html += "</td>";
	html += "<td align=right width=50%>";
	html += "<div onclick='sort_connections_popup (event)' style='font-size: 1.4em;'>&nbsp;&uarr;&darr;&nbsp;</div>";
	html += "</td>";
	html += "</tr></table>";
	html += "</td></tr>";

	if (connections = get_saved_connections ())
	{
		if (connections.length > 0)
		{
			sort_connections_by (connections);
			count = 0;

			for (i = 0; i < connections.length; i++)
			{
				text = connection_text (connections [i]);
				icon = connections [i]["favorite"] ? "img/favorite.png" : "img/not-favorite.png";

				html += "<tr " + zebra (count++) + ">";

				html += "<td><div class=pad10 ondblclick='open_connection_by_id (event, this, \"" + connections [i]["id"] + "\")'>" + text + "</div></td>";
				html += "<td width=24 align=middle><div class=pad10><img alt='turn on/off favorite' onclick='flip_favorite   (\"" + connections [i]["id"] + "\")' width=16 height=16 src='" + icon + "'img/edit.png></div></td>";
				html += "<td width=24 align=middle><div class=pad10><img alt='edit'                 onclick='edit_favorite   (\"" + connections [i]["id"] + "\")' width=16 height=16 src=img/edit.png></div></td>";
				html += "<td width=24 align=middle><div class=pad10><img alt='delete'               onclick='delete_connection (\"" + connections [i]["id"] + "\")' width=16 height=16 src=img/delete.png></div></td>";
				html += "<td width=24 align=middle><div class=pad10><img alt='history'              onclick='favorite_history (\"" + connections [i]["id"] + "\")' width=16 height=16 src=img/history.png></div></td>";
				html += "</tr>";
			}

			html += "</table>";
			html += "</div>";

			pos = get_from_storage (LM_FAVORITE_XY);

			if (obj = TMK_get_content_obj (connections_id))
				obj.innerHTML = html;
			else
			{
				connections_id = TMK_window_open ({
					header   : "Connections",
					x        : pos ? pos ["x"] : 40,
					y        : pos ? pos ["y"] : 180,
					fit      : true,
					html     : html,
					min_h    : 100,
					min_w    : 400,
					max_h    : 800,
					style    : "win",
					dragable : true,
					shadow   : true,
					resize   : true,
					onclose  : function () { connections_id = null },
					onmoved  : function (window_id, arg, pos) { save_in_storage (LM_FAVORITE_XY, pos); }
				});

				connections_icon_id = TMK_launchpad_add_window (launchpad_id, connections_id, "img/connections.png", null);
			}
		}
		else
		{
			TMK_question ({
				header   : "Error",
				w        : 400,
				html     : "<div class=pad10 style='text-align: center;'>You have no connections to view / manage</div>",
				yes_text : "Create one now",
				no_text  : "Cancel",
				onyes    : function () { new_connection (null, null, null) },
			});
		}
	}
}

// static
function flip_favorite (id)
{
	let record;

	if (record = get_from_storage (id))
	{
		record ["favorite"] = record ["favorite"] ? 0 : 1;
		save_in_storage (id, record);
		manage_connections ();
	}
}

// static
function connection_text (connection)
{
	let text;

	text  = "<table cellspacing=0 cellpadding=0><tr><td>";
	text += "<div style='width: 18px; height: 18px; border: 1px solid grey; margin-right: 12px; border-radius: 8px; background: " + TMK_make_gradient (connection ["color"]) + "'></div>";
	text += "</td><td>";
	text += connection ["name"];
	text += "</td></tr></table>";

	return text;
}

// static
function favorite_history (id)
{
	show_recents (null, null, id);
}

// static
function sort_connections_popup (e)
{
	let sort_menu;

	sort_menu = {
		direction : TMK_MENU_VERTICAL,
		type      : TMK_POPUP_MENU,
		items     : [
						{ id : LM_SORT_ASC_NAME, icon: "img/blank.png", text : "Ascending Name",         onclick : "set_connections_sort (LM_SORT_ASC_NAME)" },
						{ id : LM_SORT_DES_NAME, icon: "img/blank.png", text : "Descending Name",        onclick : "set_connections_sort (LM_SORT_DES_NAME)" },
						{ id : LM_SORT_ASC_TIME, icon: "img/blank.png", text : "Ascending Last Opened",  onclick : "set_connections_sort (LM_SORT_ASC_TIME)" },
						{ id : LM_SORT_DES_TIME, icon: "img/blank.png", text : "Descending Last Opened", onclick : "set_connections_sort (LM_SORT_DES_TIME)" },
					],
	};

	TMK_set_menu_item_icon (sort_menu, connections_sort_by, "img/checkmark.png");

	TMK_menu ({
		header   : "Sort Connections By ...",
		menu     : sort_menu,
		zebra    : true,
		x        : e.clientX + 30,
		y        : e.clientY - 30,
		fit      : true,
		max_h    : 500,
		style    : "win",
		dragable : true,
		shadow   : true,
	});
}

// static
function set_connections_sort (sort_by)
{
	connections_sort_by = sort_by;

	manage_connections ();

	save_in_storage (LM_FAVORITE_SORT, sort_by);
}

// static
function edit_favorite (id)
{
	new_connection (null, null, id);
}

// static
function delete_connection (id)
{
	let html;
	let parent;
	let connection;

	if (connection = get_from_storage (id))
	{
		html = "<div class=pad10>";
		html += "<div style='text-align: center;'>Are you sure you want to delete</div>";
		html += "<div><br></div>";
		html += "<div style='text-align: center;'><b>" + connection ["name"] + "</b></div>";
		html += "</div>";

		parent = TMK_get_window_obj (connections_id).id;

		TMK_question ({
			html  : html,
			arg   : id,
			onyes : function (id) { do_delete_connection (id); manage_connections (); },
			center_on : parent,
		});
	}
}

// static
function do_delete_connection (id)
{
	let i;
	let new_connections;
	let connections;

	new_connections = [];

	if (connections = get_saved_connections ())
	{
		for (i = 0; i < connections.length; i++)
		{
			if (connections [i]["id"] == id)
			{
				TMK_console_log ("Deleting \"" + connections [i]["name"] + "\" from connections");

				connections.splice (i--, 1);
			}
			else
				new_connections.push ({ id : connections [i]["id"], time : connections [i]["time"], });
		}

		save_in_storage (LM_FAVORITES, new_connections);
		delete_from_storage (id);
	}
}

// static
function earlier_today_menu ()
{
	let i;
	let j;
	let arg;
	let icon;
	let text;
	let count;
	let recents;
	let connections;
	let is_favorite;
	let earlier_menu;

	earlier_menu = {
		header    : "Earlier Today",
		direction : TMK_MENU_VERTICAL,
		type      : TMK_FLOATING_MENU,
		items     : [
					],
		};

	if (recents = get_recent_connections ())
	{
		if (recents.length > 0)
		{
			count = 0;
			recents.sort (cmp_des_time);
			connections = get_saved_connections ();

			for (i = recents.length - 1; i >= 0; i--)
			{
				if (++count > MAX_RECENT)
				{
					is_favorite = false;

					for (j = 0; j < connections.length; j++)
					{
						if (connections [j]["url"] == recents [i]["url"])
						{
							arg = connections [j]["id"];
							is_favorite = true;
							break;
						}
					}

					if (is_favorite)
						icon = "img/favorite.png";
					else
					{
						arg = recents [i]["id"];
						icon = "img/blank.png";
					}
					text = make_recent_text (recents [i]);

					earlier_menu ["items"].push ({ icon : icon, text : text, arg : arg, onclick : open_connection_by_id });
				}

				if (count >= MAX_RECENT + MAX_EARLIER)
					break;
			}
		}
	}

	return earlier_menu;
}

// static
function show_recents (e, obj, id)
{
	let i;
	let j;
	let u;
	let arg;
	let pos;
	let html;
	let icon;
	let text;
	let count;
	let header;
	let record;
	let recents;
	let connections;
	let is_favorite;

	if (recents = get_recent_connections ())
	{
		count = 0;

		recents.sort (cmp_des_time);

		connections = get_saved_connections ();

		html = "<table width=100% cellpadding=0 cellspacing=0>";

		for (i = 0; i < recents.length; i++)
		{
			if (id && recents [i]["id"] != id)
				continue;

			is_favorite = false;

			for (j = 0; j < connections.length; j++)
			{
				if (connections [j]["url"] == recents [i]["url"])
				{
					arg = connections [j]["id"];
					is_favorite = true;
					break;
				}
			}

			if (is_favorite)
				icon = "img/favorite.png";
			else
			{
				arg = recents [i]["id"];
				icon = "img/blank.png";
			}

			if (count < MAX_ALL_RECENT)
			{
				text = make_recent_text (recents [i]);

				html += "<tr " + zebra (count++) + ">";

				html += "<td><img class=pad10 width=16 height=16 src=" + icon + "></td>";
				html += "<td><div class=pad10>" + text + "</div></td></tr>"
			}
			else
				break;
		}

		pos = get_from_storage (LM_RECENT_XY);
		header = "Recent Connections";

		if (id)
		{
			if (record = get_from_storage (id))
				header = "Recent connections to " + record ["name"];
		}

		if (count == 0)
			html += "<tr width=300><td height=60 align=center><span style='padding: 10px'><i>No recent connection found</i></span></td></tr>";

		html += "</table>";

		recents_id = TMK_window_open ({
			header   : header,
			html     : html,
			x        : pos ? pos ["x"] : u,
			y        : pos ? pos ["y"] : u,
			max_h    : 600,
			style    : "win",
			dragable : true,
			resize   : true,
			shadow   : true,
			onmoved  : function (window_id, arg, pos) { save_in_storage (LM_RECENT_XY, pos); }
		});

		TMK_launchpad_add_window (launchpad_id, recents_id, "img/recent.png", null);
	}
	else
		TMK_error ("There are no recent connections to display");
}

// static
function clear_recent ()
{
	TMK_question ({
		html : "Are you sure you want to clear all recent connections?",
		onyes : do_clear_recent,
	});
}

// static
function do_clear_recent ()
{
	let i;
	let j;
	let recents;
	let connections;
	let is_favorite;

	if (recents = get_recent_connections ())
	{
		connections = get_saved_connections ();

		for (i = 0; i < recents.length; i++)
		{
			is_favorite = false;

			for (j = 0; j < connections.length; j++)
			{
				if (connections [j]["url"] == recents [i]["url"])
				{
					is_favorite = true;
					break;
				}
			}

			if (!is_favorite)
				delete_from_storage (recents [i]["id"]);
		}
	}

	delete_from_storage (LM_RECENTS)
}

// static
function make_recent_text (recent)
{
	let date;
	let text;
	let options;

	date = new Date (recent ["time"]);

	options = { month: 'short', day: '2-digit', year : "numeric", hour : "2-digit", minute : "2-digit", second : "2-digit" };

	text = "<span style='font-family: \"Courier New\"'>";
	text += date.toLocaleString ("en-US", options);

	text += " - " + recent ["url"];
	text += "</span>";

	return text;
}

// static
function get_launch_groups ()
{
	return get_some_records (LM_GROUPS);
}

// static
function get_recent_connections ()
{
	return get_some_records (LM_RECENTS);
}

// static
function get_saved_connections ()
{
	return get_some_records (LM_FAVORITES);
}

// static
function get_some_records (key)
{
	let i;
	let ret;
	let recent;
	let recents;

	ret = [ ];

	if (recents = get_from_storage (key))
	{
		for (i = 0; i < recents.length; i++)
		{
			if (recent = get_from_storage (recents [i]["id"]))
			{
				recent ["time"] = parseInt (recents [i]["time"]);
				ret.push (recent);
			}
		}
	}

	return ret;
}

// static
function save_to_recent (id, name, url, track, color, is_favorite, pin, x, y, w, h)
{
	TMK_console_log ("Saving \"" + url + "\" to recents");

	return save_something (LM_RECENTS, id, name, url, track, color, is_favorite, pin, x, y, w, h, true)
}

// static
function save_to_connections (id, name, url, track, color, is_favorite, pin, x, y, w, h)
{
	TMK_console_log ("Saving \"" + name + "\" to connections");

	return save_something (LM_FAVORITES, id, name, url, track, color, is_favorite, pin, x, y, w, h, false);
}

// static
function save_something (key, id, name, url, track, color, is_favorite, pin, x, y, w, h, allow_dups)
{
	let i;
	let date;
	let found;
	let recent;
	let records;

	if (!(records = get_from_storage (key)))
		records = [];

	found = false;

	if (!allow_dups)
	{
		for (i = 0; i < records.length; i++)
		{
			if (records [i]["id"] == id)
			{
				delete_from_storage (id);
				found = true;
				break;
			}
		}
	}

	if (!id)
		id = TMK_make_random_id ();

	date = new Date ();

	if (!found)
	{
		records.push ({ id : id, time : date.getTime (), });
		save_in_storage (key, records);
	}

	recent = { id : id, name : name, url : url, track : track, color : color, favorite : is_favorite, pin : pin, x : x, y : y, w : w, h : h, time : date.getTime () };
	save_in_storage (id, recent);

	return id;
}

// static
function cmp_asc_time (r1, r2)
{
	let t1;
	let t2;

	t1 = r1 ["time"];
	t2 = r2 ["time"];

	return (t1 == t2) ? 0 : ((t1 < t2) ? 1 : -1);
}

// static
function cmp_des_time (r1, r2)
{
	let t1;
	let t2;

	t1 = r1 ["time"];
	t2 = r2 ["time"];

	return (t1 == t2) ? 0 : ((t1 < t2) ? -1 : 1);
}

// static
function cmp_asc_name (r1, r2)
{
	let t1;
	let t2;

	t1 = r1 ["name"];
	t2 = r2 ["name"];

	return (t1 == t2) ? 0 : ((t1 < t2) ? -1 : 1);
}

// static
function cmp_des_name (r1, r2)
{
	let t1;
	let t2;

	t1 = r1 ["name"];
	t2 = r2 ["name"];

	return (t1 == t2) ? 0 : ((t1 < t2) ? 1 : -1);
}

// static
function zebra (count)
{
	let html;

	if ((parseInt (count / 2) * 2) == count)
		html = "style='background: rgba(100,150,200,0.20);'";
	else
		html += "";

	return html;
}

// static
function sort_connections_by (connections)
{
	switch (connections_sort_by)
	{
		case LM_SORT_ASC_NAME: connections.sort (cmp_asc_name); break;
		case LM_SORT_DES_NAME: connections.sort (cmp_des_name); break;
		case LM_SORT_ASC_TIME: connections.sort (cmp_asc_time); break;
		case LM_SORT_DES_TIME: connections.sort (cmp_des_time); break;
	}
}

// static
function trim (s)
{
	let a;

	a = s.replace(/^\s+/, '');
	return a.replace(/\s+$/, '');
}

// static
function valid_url (string)
{
	let url;

	try {
		url = new URL(string);
	} catch (_) {
		return false;
	}

	return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:" || url.protocol === "ftp:";;
}

// static
function set_license_status (val)
{
	save_in_storage (LM_LICENSE_STATUS, val);
}

// static
function get_license_status ()
{
	let val;

	val = false;

	if (val = get_from_storage (LM_LICENSE_STATUS))
		val = parseInt (val) ? true : false;

	return val;
}

// static
function credits ()
{
	let html;

	html  = "<div style='padding: 10px'>";
	html += "<div><h2>TMK_desktop.js</h2></div>";
	html += "<div><b>TMK_desktop</b> is standalone javascript / css / html solution for emulating a desktop environment in a browser</div>";
	html += "<div><br>Copyright &copy;&nbsp;2020-2021 Thomas Kraus.&nbsp;All rights reserved.</div>";
	html += "<div><br>License: MIT</div>";
	html += "<div><h2>iro.js</h2></div>";
	html += "<div>Modular color picker widget for JavaScript, with an SVG-based UI and support for a bunch of color formats</div>";
	html += "<div><br>&copy;&nbsp;James Daniel ";
	html += "<a href='https://github.com/jaames/iro.js'>https://github.com/jaames/iro.js</a></div>";
	html += "<div><br>License: Mozilla Public License 2.0</div>";

	html += "</div>";

	TMK_confirmation ({
		header : "Credits",
		html   : html,
		max_w  : 600,
		h      : 450,
	});
}

// static
function menu_about (flag)
{
	let html;

	html = "<table>";
	html += "<tr>";
	//html += "<td width=48 align=middle>";
	html += "</td><td class=bigheader>Launch Manager</td></tr>";
	html += "<tr><td colspan=2 valign=middle height=20px>";
	html += "Copyright &copy;&nbsp;2021 Thomas Kraus.&nbsp;All rights reserved.";
	html += "</td></tr>";
	html += "<tr><td colspan=2 valign=middle height=20px>";
	html += "Version: " + version;
	html += "</td></tr>";
	html += "<tr><td colspan=2 align=middle>LICENSE</td></tr>";
	html += "<tr><td colspan=2 valign=middle height=10px> </td></tr>";
	html += "<tr><td colspan=2>";
	html += 'THIS SOFTWARE IS PROVIDED BY THOMAS KRAUS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE',
	html += "</td></tr>";
	html += "</table>";

	if (flag)
	{
		TMK_question ({
			header   : "License ...",
			html     : html,
			h        : 400,
			max_w    : 800,
			onyes    : agree,
			yes_text : "Agree",
			onno     : disagree,
			no_text  : "Disagree",
		});
	}
	else
	{
		TMK_confirmation ({
			header : "About ...",
			html   : html,
			h      : 400,
			max_w  : 800,
		});
	}
}

// static
function agree ()
{
	set_license_status (1);

	TMK_confirmation ({
		html : "OK,&nbsp;let's get started",
		onok : function () { new_connection (null, null, null); },
	});
}

// static
function disagree ()
{
	if (typeof cordova !== 'undefined')
		menu_about (1);
	else
		window.location = "http://www.google.com";
}

// static
function save_in_storage (key, val)
{
	localStorage.setItem (key, JSON.stringify (val));
}

// static
function get_from_storage (key)
{
	let ret;

	if (ret = localStorage.getItem (key))
		ret = JSON.parse (ret);

	return ret;
}

// static
function delete_from_storage (key)
{
	localStorage.removeItem (key);
}

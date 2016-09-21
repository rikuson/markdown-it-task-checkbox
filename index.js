// Markdown-it plugin to render GitHub-style task lists; see
//
// https://github.com/blog/1375-task-lists-in-gfm-issues-pulls-comments
// https://github.com/blog/1825-task-lists-in-all-markdown-documents

var _ = require('underscore');

module.exports = function(md, options) {
	var defaults;
	defaults = {
	  disabled: true,
	  divWrap: false,
	  divClass: 'checkbox',
	  idPrefix: 'cbx_',
	  ulClass: 'task-list',
	  liClass: 'task-list-item'
	};
	options = _.extend(defaults, options);
	md.core.ruler.after('inline', 'github-task-lists', function(state) {
		var tokens = state.tokens;
		var lastId = 0;
		for (var i = 2; i < tokens.length; i++) {

			if (isTodoItem(tokens, i)) {
				todoify(tokens[i], lastId, options, state.Token);
				lastId += 1;
				attrSet(tokens[i-2], 'class', options.liClass);
				attrSet(tokens[parentToken(tokens, i-2)], 'class', options.ulClass);
			}
		}
	});
};

function attrSet(token, name, value) {
	var index = token.attrIndex(name);
	var attr = [name, value];

	if (index < 0) {
		token.attrPush(attr);
	} else {
		token.attrs[index] = attr;
	}
}

function parentToken(tokens, index) {
	var targetLevel = tokens[index].level - 1;
	for (var i = index - 1; i >= 0; i--) {
		if (tokens[i].level === targetLevel) {
			return i;
		}
	}
	return -1;
}

function isTodoItem(tokens, index) {
	return isInline(tokens[index]) &&
	       isParagraph(tokens[index - 1]) &&
	       isListItem(tokens[index - 2]) &&
	       startsWithTodoMarkdown(tokens[index]);
}

function todoify(token, lastId, options, TokenConstructor) {
	var id;
	id = options.idPrefix + lastId
	token.children.shift();
	token.children.push(makeCheckbox(token, id, options, TokenConstructor));
	// lable
	token.children.push(makeLable(id, TokenConstructor));
	//text
	text = new TokenConstructor("text", "", 0);
	text.content = token.content.slice(3);
	token.children.push(text);
	token.content = '';
	// token.children.push(new TokenConstructor("label_close", "label", -1));
	if (options.divWrap) {
		token.children.unshift(beginLabel(options, TokenConstructor));
		token.children.push(endLabel(TokenConstructor));
	}
}

function makeCheckbox(token, id, options, TokenConstructor) {
	var checkbox = new TokenConstructor('checkbox_input', 'input', 0);
	checkbox.attrs = [["type", "checkbox"], ["id", id]];
	var checked = (token.content.indexOf('[x] ') === 0 || token.content.indexOf('[X] ') === 0)
	if (checked === true) {
	  checkbox.attrs.push(["checked", "true"]);
	}
	if (options.disabled === true) {
	  checkbox.attrs.push(["disabled", "true"]);
	}
	
	return checkbox;
}

function makeLable(id, TokenConstructor) {
	var label = new TokenConstructor('label_open', 'label', 1);
	label.attrs = [["for", id]];
	return label;
}

// these next two functions are kind of hacky; probably should really be a
// true block-level token with .tag=='label'
function beginLabel(options, TokenConstructor) {
	var token = new TokenConstructor('checkbox_open', 'div', 0);
	token.attrs = [["class", options.divClass]];
	return token;
}

function endLabel(TokenConstructor) {
	var token = new TokenConstructor('checkbox_close', 'div', -1);
	// token.content = '</label>';
	return token;
}

function isInline(token) { return token.type === 'inline'; }
function isParagraph(token) { return token.type === 'paragraph_open'; }
function isListItem(token) { return token.type === 'list_item_open'; }

function startsWithTodoMarkdown(token) {
	// leading whitespace in a list item is already trimmed off by markdown-it
	return token.content.indexOf('[ ] ') === 0 || token.content.indexOf('[x] ') === 0 || token.content.indexOf('[X] ') === 0;
}

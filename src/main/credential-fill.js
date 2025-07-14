/*global chrome*/
(function () {
	'use strict';

	const findFields = (context) => {
			const userSelectors = [
					'input[type=email]', 'input[name*=email]', 'input[name*=user]',
					'input[type=text][name*=login]', 'input[id*=user]', 'input[aria-label*=user]'
				],
				passSelectors = [
					'input[type=password]', 'input[name*=pass]', 'input[id*=pass]',
					'input[aria-label*=pass]'
				],

				userField = context.querySelector(userSelectors.join(', ')),
				passField = context.querySelector(passSelectors.join(', '));

			return { userField, passField };
		},

		fillAndSubmit = (username, password) => {
			const activeElement = document.activeElement,
				parentForm = activeElement && activeElement.closest('form'),

			 fields = parentForm ? findFields(parentForm) : findFields(document);

			if (!fields.userField || !fields.passField) {
				return alert('Bug Magnet: Could not find username or password fields on this page.');
			}

			fields.userField.focus();
			fields.userField.value = username;
			fields.userField.dispatchEvent(new Event('input', { bubbles: true }));
			fields.userField.dispatchEvent(new Event('change', { bubbles: true }));

			fields.passField.focus();
			fields.passField.value = password;
			fields.passField.dispatchEvent(new Event('input', { bubbles: true }));
			fields.passField.dispatchEvent(new Event('change', { bubbles: true }));

			const formToSubmit = fields.passField.form || fields.userField.form;
			if (formToSubmit) {
				formToSubmit.submit();
			}
		};

	chrome.runtime.onMessage.addListener((request) => {
		if (request && request.username) {
			fillAndSubmit(request.username, request.password);
		}
	});
}());


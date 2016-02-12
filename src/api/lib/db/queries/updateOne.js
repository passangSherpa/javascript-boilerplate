export default (client, tableName, fields, idFieldName, idAutoGenerated, version, hasChange, returningFields = fields) => {
    return function* updateOne(id, data) {
        if (!id) {
            throw new Error(`No id specified for updating ${tableName} entity.`);
        }

        const setQuery = [];
        const parameters = {};
        parameters[idFieldName] = id;

        fields.forEach(field => {
            if (idAutoGenerated && field === 'id') return;
            if (typeof data[field] === 'undefined') return;
            setQuery.push(`${field}=$${field}`);
            parameters[field] = data[field];
        });
        if (parameters.length === 1) {
            throw new Error('no valid column to set');
        }

        let shouldTriggerNewVersion = false;
        if (version && (yield hasChange(parameters)) === true) {
            shouldTriggerNewVersion = true;
        }

        const query = `UPDATE ${tableName} SET ${setQuery.join(', ')} WHERE ${idFieldName} = $${idFieldName} RETURNING ${returningFields.join(', ')}`;
        const entity = (yield client.query_(query, parameters)).rows[0];
        if (!entity) {
            throw new Error('not found');
        }

        if (version) {
            yield version(entity, 'update', shouldTriggerNewVersion);
        }

        return entity;
    };
};
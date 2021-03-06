const $ = window.$ = require('jquery');
import React from 'react';

import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as Actions from '../actions';
import shortid from 'shortid';
import Select from 'react-select';
import TableElement from './TableElement';


class SqlEditorTopToolbar extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      databaseLoading: false,
      databaseOptions: [],
      schemaLoading: false,
      schemaOptions: [],
      tableLoading: false,
      tableOptions: [],
    };
  }
  componentWillMount() {
    this.fetchDatabaseOptions();
    this.fetchSchemas();
    this.fetchTables();
  }
  getSql(table) {
    let cols = '';
    table.columns.forEach(function (col, i) {
      cols += col.name;
      if (i < table.columns.length - 1) {
        cols += ', ';
      }
    });
    return `SELECT ${cols}\nFROM ${table.name}`;
  }
  popTab(table) {
    const qe = {
      id: shortid.generate(),
      title: table.name,
      dbId: table.dbId,
      schema: table.schema,
      autorun: true,
      sql: this.getSql(table),
    };
    this.props.actions.addQueryEditor(qe);
  }
  fetchTables(dbId, schema) {
    const actualDbId = dbId || this.props.queryEditor.dbId;
    if (actualDbId) {
      const actualSchema = schema || this.props.queryEditor.schema;
      this.setState({ tableLoading: true });
      this.setState({ tableOptions: [] });
      const url = `/caravel/tables/${actualDbId}/${actualSchema}`;
      $.get(url, (data) => {
        let tableOptions = data.tables.map((s) => ({ value: s, label: s }));
        const views = data.views.map((s) => ({ value: s, label: '[view] ' + s }));
        tableOptions = [...tableOptions, ...views];
        this.setState({ tableOptions });
        this.setState({ tableLoading: false });
      });
    }
  }
  changeSchema(schemaOpt) {
    const schema = (schemaOpt) ? schemaOpt.value : null;
    this.props.actions.queryEditorSetSchema(this.props.queryEditor, schema);
    this.fetchTables(this.props.queryEditor.dbId, schema);
  }
  fetchSchemas(dbId) {
    const actualDbId = dbId || this.props.queryEditor.dbId;
    if (actualDbId) {
      this.setState({ schemaLoading: true });
      const url = `/databasetablesasync/api/read?_flt_0_id=${actualDbId}`;
      $.get(url, (data) => {
        const schemas = data.result[0].all_schema_names;
        const schemaOptions = schemas.map((s) => ({ value: s, label: s }));
        this.setState({ schemaOptions });
        this.setState({ schemaLoading: false });
      });
    }
  }
  changeDb(db) {
    const val = (db) ? db.value : null;
    this.setState({ schemaOptions: [] });
    this.props.actions.queryEditorSetDb(this.props.queryEditor, val);
    if (!(db)) {
      this.setState({ tableOptions: [] });
      return;
    }
    this.fetchTables(val, this.props.queryEditor.schema);
    this.fetchSchemas(val);
  }
  fetchDatabaseOptions() {
    this.setState({ databaseLoading: true });
    const url = '/databaseasync/api/read';
    $.get(url, (data) => {
      const options = data.result.map((db) => ({ value: db.id, label: db.database_name }));
      this.setState({ databaseOptions: options });
      this.setState({ databaseLoading: false });
    });
  }
  closePopover(ref) {
    this.refs[ref].hide();
  }
  changeTable(tableOpt) {
    const tableName = tableOpt.value;
    const qe = this.props.queryEditor;
    const url = `/caravel/table/${qe.dbId}/${tableName}/${qe.schema}/`;
    $.get(url, (data) => {
      this.props.actions.addTable({
        id: shortid.generate(),
        dbId: this.props.queryEditor.dbId,
        queryEditorId: this.props.queryEditor.id,
        name: data.name,
        schema: qe.schema,
        columns: data.columns,
        expanded: true,
      });
    })
    .fail(() => {
      this.props.actions.addAlert({
        msg: 'Error occurred while fetching metadata',
        bsStyle: 'danger',
      });
    });
  }
  render() {
    const tables = this.props.tables.filter((t) => (t.queryEditorId === this.props.queryEditor.id));
    return (
      <div className="clearfix sql-toolbar">
        <div>
          <Select
            name="select-db"
            placeholder="[Database]"
            options={this.state.databaseOptions}
            value={this.props.queryEditor.dbId}
            isLoading={this.state.databaseLoading}
            autosize={false}
            onChange={this.changeDb.bind(this)}
          />
        </div>
        <div className="m-t-5">
          <Select
            name="select-schema"
            placeholder="[Schema]"
            options={this.state.schemaOptions}
            value={this.props.queryEditor.schema}
            isLoading={this.state.schemaLoading}
            autosize={false}
            onChange={this.changeSchema.bind(this)}
          />
        </div>
        <div className="m-t-5">
          <Select
            name="select-table"
            ref="selectTable"
            isLoading={this.state.tableLoading}
            placeholder="Add a table"
            autosize={false}
            value={this.state.tableName}
            onChange={this.changeTable.bind(this)}
            options={this.state.tableOptions}
          />
        </div>
        <hr />
        <div className="m-t-5">
          {tables.map((table) => <TableElement table={table} queryEditor={this.props.queryEditor} />)}
        </div>
      </div>
    );
  }
}

SqlEditorTopToolbar.propTypes = {
  queryEditor: React.PropTypes.object,
  tables: React.PropTypes.array,
  actions: React.PropTypes.object,
};

SqlEditorTopToolbar.defaultProps = {
  tables: [],
};

function mapStateToProps(state) {
  return {
    tables: state.tables,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(Actions, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SqlEditorTopToolbar);

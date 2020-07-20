import React from 'react';
import ExportMetadata from './ExportMetadata';
import ImportMetadata from './ImportMetadata';
import ReloadMetadata from './ReloadMetadata';
import ResetMetadata from './ResetMetadata';
import ExportSchema from './ExportSchema';

import styles from '../Settings.scss';
import { exportSchema } from '../Actions';

const MetadataOptions = props => {
  const MetadataImportExportSection = () => {
    return (
      <div>
        <div className={styles.intro_note}>
          <h4>Import/Export metadata</h4>
          <div className={styles.content_width}>
            Get Hasura metadata as JSON.
          </div>
        </div>

        <div className={styles.display_inline}>
          <ExportMetadata {...props} />
        </div>

        <div className={styles.display_inline}>
          <ImportMetadata {...props} />
        </div>
      </div>
    );
  };

  const MetadataUpdateSection = () => {
    return (
      <div>
        <div key="meta_data_1" className={styles.intro_note}>
          <h4>Reload metadata</h4>
          <div className={styles.content_width}>
            Refresh Hasura metadata, typically required if you have changed the
            underlying postgres or if you have updated your remote schemas.
          </div>
        </div>

        <div key="meta_data_2">
          <ReloadMetadata {...props} />
        </div>

        <div key="meta_data_3" className={styles.intro_note}>
          <h4>Reset metadata</h4>
          <div className={styles.content_width}>
            Permanently clear GraphQL Engine's metadata and configure it from
            scratch (tracking relevant tables and relationships). This process
            is not reversible.
          </div>
        </div>

        <div key="meta_data_4">
          <ResetMetadata {...props} />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`${styles.clear_fix} ${styles.padd_left} ${styles.padd_top} ${styles.metadata_wrapper} container-fluid`}
    >
      <div className={styles.subHeader}>
        <h2 className={styles.headerText}>Hasura Metadata Actions</h2>
      </div>
      <div className={styles.add_mar_top}>
        <div className={styles.content_width}>
          Hasura metadata stores information about your tables, relationships,
          permissions, etc. that is used to generate the GraphQL schema and
          API.&nbsp;
          <a
            href="https://hasura.io/docs/1.0/graphql/manual/how-it-works/metadata-schema.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i>(Read more)</i>
          </a>
        </div>

        <MetadataImportExportSection />
        <ExportSchema exportSchema={props.exportSchema} />

        <MetadataUpdateSection />
      </div>
    </div>
  );
};

const mapStateToProps = state => {
  return {
    ...state.main,
    metadata: state.metadata,
    dataHeaders: { ...state.tables.dataHeaders },
  };
};
const mapDispatchToProps = dispatch => {
  return {
    // dispatching plain actions
    exportSchema: () => dispatch(exportSchema()),
    dispatch,
  };
};
const metadataOptsConnector = connect =>
  connect(mapStateToProps, mapDispatchToProps)(MetadataOptions);

export default metadataOptsConnector;

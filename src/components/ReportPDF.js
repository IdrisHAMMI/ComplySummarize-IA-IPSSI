import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 24 },
  section: { marginBottom: 12 },
  heading: { fontSize: 18, marginBottom: 8 },
  text: { fontSize: 12 }
});

const ReportPDF = ({ data }) => (
  <Document>
    <Page style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.heading}>Document Summary</Text>
        <Text style={styles.text}>{data.summary}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.heading}>Key Points</Text>
        {data.keyPoints && data.keyPoints.map((point, idx) => (
          <Text key={idx} style={styles.text}>• {point}</Text>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.heading}>Suggested Actions</Text>
        {data.suggestedActions && data.suggestedActions.map((action, idx) => (
          <Text key={idx} style={styles.text}>
            [{action.priority}] {action.action}
          </Text>
        ))}
      </View>
    </Page>
  </Document>
);

export default ReportPDF;
